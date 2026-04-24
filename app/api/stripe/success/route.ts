import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { stripe } from "@/lib/stripe"
import { getDefaultAppPath } from "@/lib/default-app-path"
import { getSiteConfig } from "@/lib/site-config"
import { applySuccessfulBoostPayment, getPublicAppUrl, getStripeSessionHashSecret, parseBoostLevel } from "@/lib/stripe-boost"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const sessionId = url.searchParams.get("session_id")
  const publicOrigin = getPublicAppUrl(req, url.origin)
  if (!publicOrigin) {
    return NextResponse.json({ error: "Missing app URL" }, { status: 500 })
  }

  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.redirect(new URL("/?error=unauthorized", publicOrigin))
  }
  if (sessionUser.role !== "ORGANIZER") {
    return NextResponse.redirect(new URL(`${getDefaultAppPath(sessionUser.role)}?error=forbidden`, publicOrigin))
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

  if (!getStripeSessionHashSecret()) {
    return NextResponse.redirect(new URL("/events?payment=error&reason=missing_hash_secret", publicOrigin))
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)

    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.redirect(new URL(`/events?payment=error&reason=not_paid&session_id=${encodeURIComponent(sessionId)}`, publicOrigin))
    }

    const metadata = checkoutSession.metadata ?? undefined
    const eventId = metadata?.eventId
    const organizerId = metadata?.organizerId
    const level = parseBoostLevel(metadata?.level)

    if (!eventId || !organizerId) {
      return NextResponse.redirect(new URL(`/events?payment=error&reason=missing_metadata&session_id=${encodeURIComponent(sessionId)}`, publicOrigin))
    }

    if (organizerId !== sessionUser.sub) {
      return NextResponse.redirect(new URL(`/events?payment=error&reason=forbidden&eventId=${encodeURIComponent(eventId)}`, publicOrigin))
    }

    await prisma.$transaction(async (tx) => {
      await applySuccessfulBoostPayment(tx, {
        sessionId,
        level,
        amount: checkoutSession.amount_total ?? 0,
        currency: checkoutSession.currency ?? "chf",
        eventId,
        organizerId,
        authorizedOrganizerId: sessionUser.sub,
      })
    })

    return NextResponse.redirect(new URL(`/events`, publicOrigin))
  } catch (error) {
    console.error("GET /api/stripe/success error:", error)
    return NextResponse.redirect(new URL(`/events?payment=error&reason=server_error&session_id=${encodeURIComponent(sessionId)}`, publicOrigin))
  }
}
