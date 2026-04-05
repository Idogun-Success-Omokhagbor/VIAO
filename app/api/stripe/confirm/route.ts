import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { stripe } from "@/lib/stripe"
import { getSiteConfig } from "@/lib/site-config"
import { applySuccessfulBoostPayment, getStripeSessionHashSecret, parseBoostLevel } from "@/lib/stripe-boost"

export const runtime = "nodejs"

const schema = z.object({
  sessionId: z.string().min(1),
})

export async function POST(req: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (sessionUser.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Only organizers can confirm boosts" }, { status: 403 })
  }

  const config = await getSiteConfig()
  if (!config.stripeEnabled) {
    return NextResponse.json({ error: "Boosting is currently disabled" }, { status: 403 })
  }

  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 })
  }
  if (!getStripeSessionHashSecret()) {
    return NextResponse.json({ error: "Missing Stripe hash configuration" }, { status: 500 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(parsed.data.sessionId)

    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    const metadata = checkoutSession.metadata ?? undefined
    const eventId = metadata?.eventId
    const organizerId = metadata?.organizerId
    const level = parseBoostLevel(metadata?.level)

    if (!eventId || !organizerId) {
      return NextResponse.json({ error: "Missing session metadata" }, { status: 400 })
    }

    if (organizerId !== sessionUser.sub) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      await applySuccessfulBoostPayment(tx, {
        sessionId: checkoutSession.id,
        level,
        amount: checkoutSession.amount_total ?? 0,
        currency: checkoutSession.currency ?? "chf",
        eventId,
        organizerId,
        authorizedOrganizerId: sessionUser.sub,
      })

      return tx.event.findUnique({
        where: { id: eventId },
        select: { id: true, isBoosted: true, boostLevel: true, boostUntil: true },
      })
    })

    if (!updated) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    return NextResponse.json({ updated })
  } catch (error) {
    console.error("POST /api/stripe/confirm error:", error)
    return NextResponse.json({ error: "Failed to confirm payment" }, { status: 500 })
  }
}
