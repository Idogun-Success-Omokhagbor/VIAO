import crypto from "crypto"
import { Prisma } from "@prisma/client"

export type BoostCheckoutStatus = "PAID" | "CREATED" | "PROCESSED"

export interface UpsertBoostCheckoutOptions {
  sessionId: string
  sessionHash: string
  status: BoostCheckoutStatus
  level: number
  amount: number
  currency: string
  eventId: string
  organizerId: string
}

export interface ApplyBoostPaymentOptions {
  sessionId: string
  level: number
  amount: number
  currency: string
  eventId: string
  organizerId: string
  authorizedOrganizerId?: string
}

type BoostCheckoutClient = Pick<Prisma.TransactionClient, "boostCheckout">
type BoostPaymentClient = Pick<Prisma.TransactionClient, "boostCheckout" | "event" | "boostReceipt" | "notification">

function normalizeUrl(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  return withProto.replace(/\/+$/, "")
}

function isLocalhostUrl(value: string | null | undefined): boolean {
  if (!value) return false

  try {
    const host = new URL(value).hostname
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0"
  } catch {
    return false
  }
}

export function getPublicAppUrl(req: Request, fallbackOrigin?: string): string | null {
  const envAppUrl = normalizeUrl(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL)
  const requestOrigin = normalizeUrl(req.headers.get("origin"))
  const forwardedProto = (req.headers.get("x-forwarded-proto") || "").split(",")[0]?.trim() || ""
  const forwardedHost = (req.headers.get("x-forwarded-host") || "").split(",")[0]?.trim() || ""
  const host = (req.headers.get("host") || "").split(",")[0]?.trim() || ""
  const derived = normalizeUrl(
    forwardedHost
      ? `${forwardedProto || "https"}://${forwardedHost}`
      : host
        ? `${forwardedProto || "https"}://${host}`
        : null,
  )

  return envAppUrl && !isLocalhostUrl(envAppUrl) ? envAppUrl : derived || requestOrigin || normalizeUrl(fallbackOrigin) || envAppUrl
}

export function getStripeSessionHashSecret(): string | null {
  return process.env.STRIPE_SESSION_HASH_SECRET || process.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_SECRET_KEY || null
}

export function hashStripeSessionId(sessionId: string, secret = getStripeSessionHashSecret()): string | null {
  if (!secret) return null
  return crypto.createHmac("sha256", secret).update(sessionId).digest("hex")
}

export function parseBoostLevel(level: string | null | undefined): 1 | 2 {
  return level === "2" ? 2 : 1
}

export async function upsertBoostCheckout(client: BoostCheckoutClient, opts: UpsertBoostCheckoutOptions) {
  const existingByRaw = await client.boostCheckout.findUnique({
    where: { stripeSessionIdHash: opts.sessionId },
  })
  const existingByHash = existingByRaw
    ? null
    : await client.boostCheckout.findUnique({
        where: { stripeSessionIdHash: opts.sessionHash },
      })

  const nextStripeSessionIdHash = existingByRaw ? opts.sessionId : opts.sessionHash

  if (existingByRaw || existingByHash) {
    return client.boostCheckout.update({
      where: { id: (existingByRaw ?? existingByHash)!.id },
      data: {
        stripeSessionIdHash: nextStripeSessionIdHash,
        status: opts.status,
        level: opts.level,
        amount: opts.amount,
        currency: opts.currency,
        eventId: opts.eventId,
        organizerId: opts.organizerId,
      },
      select: {
        id: true,
        level: true,
        amount: true,
        currency: true,
      },
    })
  }

  return client.boostCheckout.create({
    data: {
      stripeSessionIdHash: opts.sessionHash,
      status: opts.status,
      level: opts.level,
      amount: opts.amount,
      currency: opts.currency,
      eventId: opts.eventId,
      organizerId: opts.organizerId,
    },
    select: {
      id: true,
      level: true,
      amount: true,
      currency: true,
    },
  })
}

export async function applySuccessfulBoostPayment(
  client: BoostPaymentClient,
  opts: ApplyBoostPaymentOptions,
): Promise<{ processed: boolean }> {
  const sessionHash = hashStripeSessionId(opts.sessionId)
  if (!sessionHash) {
    throw new Error("missing_hash_secret")
  }

  const checkout = await upsertBoostCheckout(client, {
    sessionId: opts.sessionId,
    sessionHash,
    status: "PAID",
    level: opts.level,
    amount: opts.amount,
    currency: opts.currency,
    eventId: opts.eventId,
    organizerId: opts.organizerId,
  })

  const claim = await client.boostCheckout.updateMany({
    where: {
      processedAt: null,
      OR: [{ stripeSessionIdHash: sessionHash }, { stripeSessionIdHash: opts.sessionId }],
    },
    data: { processedAt: new Date(), status: "PROCESSED" },
  })

  await client.boostCheckout.update({
    where: { id: checkout.id },
    data: { stripeSessionIdHash: opts.sessionId },
  })

  if ((claim.count ?? 0) === 0) {
    return { processed: false }
  }

  const existing = await client.event.findUnique({
    where: { id: opts.eventId },
    select: {
      id: true,
      title: true,
      boostUntil: true,
      boostLevel: true,
      isCancelled: true,
      organizerId: true,
    },
  })

  if (!existing) {
    throw new Error("event_not_found")
  }

  if (opts.authorizedOrganizerId && existing.organizerId !== opts.authorizedOrganizerId) {
    throw new Error("forbidden")
  }

  if (existing.isCancelled) {
    throw new Error("event_cancelled")
  }

  const base = existing.boostUntil && existing.boostUntil.getTime() > Date.now() ? new Date(existing.boostUntil) : new Date()
  const boostUntil = new Date(base)
  boostUntil.setHours(boostUntil.getHours() + (opts.level === 2 ? 72 : 24))

  const nextLevel = Math.max(existing.boostLevel ?? 0, opts.level)

  await client.event.update({
    where: { id: opts.eventId },
    data: { isBoosted: true, boostUntil, boostLevel: nextLevel },
    select: { id: true },
  })

  await client.boostReceipt.upsert({
    where: { boostCheckoutId: checkout.id },
    update: {
      level: opts.level,
      amount: opts.amount,
      currency: opts.currency,
      boostUntil,
      eventTitle: existing.title,
      eventId: opts.eventId,
      organizerId: opts.organizerId,
    },
    create: {
      level: opts.level,
      amount: opts.amount,
      currency: opts.currency,
      boostUntil,
      eventTitle: existing.title,
      eventId: opts.eventId,
      organizerId: opts.organizerId,
      boostCheckoutId: checkout.id,
    },
    select: { id: true },
  })

  await client.notification.create({
    data: {
      userId: opts.organizerId,
      type: "MESSAGE",
      title: "Boost activated",
      body: `Your event “${existing.title}” is now boosted for ${opts.level === 2 ? 72 : 24} hours.`,
      data: { eventId: opts.eventId, level: opts.level, boostUntil: boostUntil.toISOString() },
    },
    select: { id: true },
  })

  return { processed: true }
}
