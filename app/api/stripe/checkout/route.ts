import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { stripe } from "@/lib/stripe"
import { getBoostPlan } from "@/lib/boost-pricing"
import { getSiteConfig } from "@/lib/site-config"
import { getPublicAppUrl, getStripeSessionHashSecret, hashStripeSessionId, upsertBoostCheckout } from "@/lib/stripe-boost"

export const runtime = "nodejs"

const schema = z.object({
  eventId: z.string().min(1),
  level: z.union([z.literal(1), z.literal(2)]).optional(),
})

export async function POST(req: Request) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Only organizers can boost events" }, { status: 403 })
  }

  const config = await getSiteConfig()
  if (!config.stripeEnabled) {
    return NextResponse.json({ error: "Boosting is currently disabled" }, { status: 403 })
  }

  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const { eventId, level } = parsed.data
  const boostLevel = level ?? 1

  const existing = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, organizerId: true, isCancelled: true },
  })

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (existing.organizerId !== session.sub) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  if (existing.isCancelled) return NextResponse.json({ error: "Cannot boost a cancelled event" }, { status: 400 })

  const boostPlan = getBoostPlan(boostLevel)
  const amount = boostPlan.amountMinor
  const name = boostPlan.name
  const duration = boostPlan.durationLabel

  const appUrl = getPublicAppUrl(req)
  if (!appUrl) return NextResponse.json({ error: "Missing app URL" }, { status: 500 })

  if (!getStripeSessionHashSecret()) {
    return NextResponse.json({ error: "Missing Stripe hash configuration" }, { status: 500 })
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      invoice_creation: {
        enabled: true,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "chf",
            unit_amount: amount,
            product_data: {
              name,
              description: `Boost "${existing.title}" for ${duration}`,
            },
          },
        },
      ],
      success_url: `${appUrl}/api/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/api/stripe/cancel?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        eventId: existing.id,
        level: String(boostLevel),
        organizerId: existing.organizerId,
      },
    })

    if (!checkoutSession.url) {
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
    }

    const sessionHash = hashStripeSessionId(checkoutSession.id)
    if (!sessionHash) {
      return NextResponse.json({ error: "Missing Stripe hash configuration" }, { status: 500 })
    }
    await upsertBoostCheckout(prisma, {
      sessionId: checkoutSession.id,
      sessionHash,
      status: "CREATED",
      level: boostLevel,
      amount,
      currency: "chf",
      eventId: existing.id,
      organizerId: existing.organizerId,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error("POST /api/stripe/checkout error:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
