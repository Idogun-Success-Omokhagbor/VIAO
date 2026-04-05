import { NextResponse } from "next/server"
import type Stripe from "stripe"

import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import { getSiteConfig } from "@/lib/site-config"
import { applySuccessfulBoostPayment, getStripeSessionHashSecret, parseBoostLevel } from "@/lib/stripe-boost"

export const runtime = "nodejs"

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 })
  }

  const signature = req.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing Stripe webhook configuration" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const payload = await req.text()
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature"
    console.error("Stripe webhook signature verification failed:", message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const config = await getSiteConfig()
  if (!config.stripeEnabled) {
    return NextResponse.json({ received: true })
  }

  if (!getStripeSessionHashSecret()) {
    return NextResponse.json({ error: "Missing Stripe hash configuration" }, { status: 400 })
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object
      const sessionId = typeof session.id === "string" ? session.id : null
      const metadata = session.metadata ?? null
      const eventId = metadata?.eventId
      const organizerId = metadata?.organizerId
      const level = parseBoostLevel(metadata?.level)

      if (sessionId && eventId && organizerId) {
        await prisma.$transaction(async (tx) => {
          await applySuccessfulBoostPayment(tx, {
            sessionId,
            level,
            amount: session.amount_total ?? 0,
            currency: session.currency ?? "chf",
            eventId,
            organizerId,
          })
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Stripe webhook handler error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
