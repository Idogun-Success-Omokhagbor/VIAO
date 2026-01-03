import { NextResponse } from "next/server"
import crypto from "crypto"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { stripe } from "@/lib/stripe"
import { getSiteConfig } from "@/lib/site-config"

export const runtime = "nodejs"

async function upsertBoostCheckout(
  tx: any,
  opts: {
    sessionId: string
    sessionHash: string
    status: "PAID" | "CREATED" | "PROCESSED"
    level: number
    amount: number
    currency: string
    eventId: string
    organizerId: string
  },
) {
  const existingByRaw = await tx.boostCheckout.findUnique({ where: { stripeSessionIdHash: opts.sessionId } })
  const existingByHash = existingByRaw
    ? null
    : await tx.boostCheckout.findUnique({ where: { stripeSessionIdHash: opts.sessionHash } })

  const nextStripeSessionIdHash = existingByRaw ? opts.sessionId : opts.sessionHash

  if (existingByRaw || existingByHash) {
    return tx.boostCheckout.update({
      where: { id: (existingByRaw ?? existingByHash).id },
      data: {
        stripeSessionIdHash: nextStripeSessionIdHash,
        status: opts.status,
        level: opts.level,
        amount: opts.amount,
        currency: opts.currency,
        eventId: opts.eventId,
        organizerId: opts.organizerId,
      },
      select: { id: true, level: true, amount: true, currency: true } as any,
    })
  }

  return tx.boostCheckout.create({
    data: {
      stripeSessionIdHash: opts.sessionHash,
      status: opts.status,
      level: opts.level,
      amount: opts.amount,
      currency: opts.currency,
      eventId: opts.eventId,
      organizerId: opts.organizerId,
    },
    select: { id: true, level: true, amount: true, currency: true } as any,
  })
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const sessionId = url.searchParams.get("session_id")

  const normalizeUrl = (value: string | null | undefined) => {
    if (!value) return null
    const trimmed = value.trim()
    if (!trimmed) return null
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    return withProto.replace(/\/+$/, "")
  }

  const isLocalhostUrl = (value: string | null | undefined) => {
    if (!value) return false
    try {
      const host = new URL(value).hostname
      return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0"
    } catch {
      return false
    }
  }

  const envAppUrl = normalizeUrl(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL)
  const forwardedProto = (req.headers.get("x-forwarded-proto") || "").split(",")[0]?.trim() || ""
  const forwardedHost = (req.headers.get("x-forwarded-host") || "").split(",")[0]?.trim() || ""
  const host = (req.headers.get("host") || "").split(",")[0]?.trim() || ""
  const derived = normalizeUrl(forwardedHost ? `${forwardedProto || "https"}://${forwardedHost}` : host ? `${forwardedProto || "https"}://${host}` : null)

  const publicOrigin = (envAppUrl && !isLocalhostUrl(envAppUrl) ? envAppUrl : derived || url.origin)

  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.redirect(new URL("/?error=unauthorized", publicOrigin))
  }
  if (sessionUser.role !== "ORGANIZER") {
    return NextResponse.redirect(new URL("/dashboard?error=forbidden", publicOrigin))
  }

  const config = await getSiteConfig()
  if (!config.stripeEnabled) {
    return NextResponse.redirect(new URL("/events?payment=error&reason=boosting_disabled", publicOrigin))
  }

  if (!stripe) {
    return NextResponse.redirect(new URL("/events?payment=error&reason=stripe_not_configured", publicOrigin))
  }

  if (!sessionId) {
    return NextResponse.redirect(new URL("/events?payment=error&reason=missing_session", publicOrigin))
  }

  const hmacSecret =
    process.env.STRIPE_SESSION_HASH_SECRET || process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_SECRET_KEY
  if (!hmacSecret) {
    return NextResponse.redirect(new URL("/events?payment=error&reason=missing_hash_secret", publicOrigin))
  }

  const sessionHash = crypto.createHmac("sha256", hmacSecret).update(sessionId).digest("hex")

  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)
    const paymentStatus = (checkoutSession as any).payment_status as string | undefined

    if (paymentStatus !== "paid") {
      return NextResponse.redirect(new URL(`/events?payment=error&reason=not_paid&session_id=${encodeURIComponent(sessionId)}`, publicOrigin))
    }

    const metadata = (checkoutSession as any).metadata as Record<string, string> | undefined
    const eventId = metadata?.eventId
    const organizerId = metadata?.organizerId
    const levelRaw = metadata?.level
    const level = levelRaw === "2" ? 2 : 1

    if (!eventId || !organizerId) {
      return NextResponse.redirect(new URL(`/events?payment=error&reason=missing_metadata&session_id=${encodeURIComponent(sessionId)}`, publicOrigin))
    }

    if (organizerId !== sessionUser.sub) {
      return NextResponse.redirect(new URL(`/events?payment=error&reason=forbidden&eventId=${encodeURIComponent(eventId)}`, publicOrigin))
    }

    const amountTotal = (checkoutSession as any).amount_total
    const currency = (checkoutSession as any).currency

    await prisma.$transaction(async (tx) => {
      const checkout = await upsertBoostCheckout(tx as any, {
        sessionId,
        sessionHash,
        status: "PAID",
        level,
        amount: typeof amountTotal === "number" ? amountTotal : 0,
        currency: typeof currency === "string" ? currency : "chf",
        eventId,
        organizerId,
      })

      const claim = await (tx as any).boostCheckout.updateMany({
        where: { processedAt: null, OR: [{ stripeSessionIdHash: sessionHash }, { stripeSessionIdHash: sessionId }] },
        data: { processedAt: new Date(), status: "PROCESSED" },
      })

      await (tx as any).boostCheckout.update({ where: { id: checkout.id }, data: { stripeSessionIdHash: sessionId } })

      if ((claim?.count ?? 0) === 0) {
        return
      }

      const existing = (await (tx as any).event.findUnique({
        where: { id: eventId },
        select: { id: true, title: true, boostUntil: true, boostLevel: true, isCancelled: true, organizerId: true } as any,
      })) as any

      if (!existing) throw new Error("event_not_found")
      if (existing.isCancelled) throw new Error("event_cancelled")
      if (existing.organizerId !== sessionUser.sub) throw new Error("forbidden")

      const base =
        existing.boostUntil && existing.boostUntil.getTime() > Date.now() ? new Date(existing.boostUntil) : new Date()
      const boostUntil = new Date(base)
      boostUntil.setHours(boostUntil.getHours() + (level === 2 ? 72 : 24))

      const nextLevel = Math.max((existing?.boostLevel as number | null | undefined) ?? 0, level)

      await (tx as any).event.update({
        where: { id: eventId },
        data: { isBoosted: true, boostUntil, boostLevel: nextLevel } as any,
        select: { id: true } as any,
      })

      await (tx as any).boostReceipt.upsert({
        where: { boostCheckoutId: checkout.id },
        update: {
          level,
          amount: typeof amountTotal === "number" ? amountTotal : 0,
          currency: typeof currency === "string" ? currency : "chf",
          boostUntil,
          eventTitle: existing.title,
          eventId,
          organizerId,
        },
        create: {
          level,
          amount: typeof amountTotal === "number" ? amountTotal : 0,
          currency: typeof currency === "string" ? currency : "chf",
          boostUntil,
          eventTitle: existing.title,
          eventId,
          organizerId,
          boostCheckoutId: checkout.id,
        },
        select: { id: true } as any,
      })

      await (tx as any).notification.create({
        data: {
          userId: organizerId,
          type: "MESSAGE",
          title: "Boost activated",
          body: `Your event “${existing.title}” is now boosted for ${level === 2 ? 72 : 24} hours.`,
          data: { eventId, level, boostUntil: boostUntil.toISOString() },
        },
        select: { id: true } as any,
      })
    })

    return NextResponse.redirect(new URL(`/events`, publicOrigin))
  } catch (error) {
    console.error("GET /api/stripe/success error:", error)
    return NextResponse.redirect(new URL(`/events?payment=error&reason=server_error&session_id=${encodeURIComponent(sessionId)}`, publicOrigin))
  }
}
