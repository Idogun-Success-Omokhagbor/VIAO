import { NextResponse } from "next/server"
import crypto from "crypto"

import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"

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
      select: { id: true } as any,
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
    select: { id: true } as any,
  })
}

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 })
  }

  const hmacSecret =
    process.env.STRIPE_SESSION_HASH_SECRET || process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_SECRET_KEY
  if (!hmacSecret) {
    return NextResponse.json({ error: "Missing Stripe hash configuration" }, { status: 400 })
  }

  const signature = req.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing Stripe webhook configuration" }, { status: 400 })
  }

  let event: any

  try {
    const payload = await req.text()
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature"
    console.error("Stripe webhook signature verification failed:", message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any
      const sessionId = typeof session?.id === "string" ? session.id : null
      const metadata = (session?.metadata ?? null) as Record<string, string> | null
      const eventId = metadata?.eventId
      const organizerId = metadata?.organizerId
      const levelRaw = metadata?.level
      const level = levelRaw === "2" ? 2 : 1

      if (sessionId && eventId && organizerId) {
        const sessionHash = crypto.createHmac("sha256", hmacSecret).update(sessionId).digest("hex")

        await prisma.$transaction(async (tx) => {
          const checkout = await upsertBoostCheckout(tx as any, {
            sessionId,
            sessionHash,
            status: "PAID",
            level,
            amount: typeof session?.amount_total === "number" ? session.amount_total : 0,
            currency: typeof session?.currency === "string" ? session.currency : "chf",
            eventId,
            organizerId,
          })

          const claim = await (tx as any).boostCheckout.updateMany({
            where: { processedAt: null, OR: [{ stripeSessionIdHash: sessionHash }, { stripeSessionIdHash: sessionId }] },
            data: { processedAt: new Date(), status: "PROCESSED" },
          })

          await (tx as any).boostCheckout.update({ where: { id: checkout.id }, data: { stripeSessionIdHash: sessionId } })

          if ((claim?.count ?? 0) === 0) return

          const existing = (await (tx as any).event.findUnique({
            where: { id: eventId },
            select: { id: true, title: true, boostUntil: true, boostLevel: true, isCancelled: true } as any,
          })) as any

          if (existing && !existing.isCancelled) {
            const base =
              existing.boostUntil && existing.boostUntil.getTime() > Date.now() ? new Date(existing.boostUntil) : new Date()
            const boostUntil = new Date(base)
            boostUntil.setHours(boostUntil.getHours() + (level === 2 ? 72 : 24))

            const nextLevel = Math.max((existing.boostLevel as number | null | undefined) ?? 0, level)

            await (tx as any).event.update({
              where: { id: eventId },
              data: { isBoosted: true, boostUntil, boostLevel: nextLevel } as any,
              select: { id: true } as any,
            })

            await (tx as any).boostReceipt.upsert({
              where: { boostCheckoutId: checkout.id },
              update: {
                level,
                amount: typeof session?.amount_total === "number" ? session.amount_total : 0,
                currency: typeof session?.currency === "string" ? session.currency : "chf",
                boostUntil,
                eventTitle: existing.title,
                eventId,
                organizerId,
              },
              create: {
                level,
                amount: typeof session?.amount_total === "number" ? session.amount_total : 0,
                currency: typeof session?.currency === "string" ? session.currency : "chf",
                boostUntil,
                eventTitle: existing.title,
                eventId,
                organizerId,
                boostCheckoutId: checkout.id,
              },
              select: { id: true } as any,
            })
          }
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Stripe webhook handler error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
