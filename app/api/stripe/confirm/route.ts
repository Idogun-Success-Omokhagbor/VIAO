import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { stripe } from "@/lib/stripe"
import { getSiteConfig } from "@/lib/site-config"

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

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(parsed.data.sessionId)

    const paymentStatus = (checkoutSession as any).payment_status as string | undefined
    if (paymentStatus !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    const metadata = (checkoutSession as any).metadata as Record<string, string> | undefined
    const eventId = metadata?.eventId
    const organizerId = metadata?.organizerId
    const levelRaw = metadata?.level
    const level = levelRaw === "2" ? 2 : 1

    if (!eventId || !organizerId) {
      return NextResponse.json({ error: "Missing session metadata" }, { status: 400 })
    }

    if (organizerId !== sessionUser.sub) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const existing = (await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, boostUntil: true, boostLevel: true, isCancelled: true, organizerId: true } as any,
    })) as any

    if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 })
    if (existing.isCancelled) return NextResponse.json({ error: "Cannot boost a cancelled event" }, { status: 400 })
    if (existing.organizerId !== sessionUser.sub) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const base = existing.boostUntil && existing.boostUntil.getTime() > Date.now() ? new Date(existing.boostUntil) : new Date()
    const boostUntil = new Date(base)
    boostUntil.setHours(boostUntil.getHours() + (level === 2 ? 72 : 24))

    const nextLevel = Math.max((existing?.boostLevel as number | null | undefined) ?? 0, level)

    const updated = (await prisma.event.update({
      where: { id: eventId },
      data: { isBoosted: true, boostUntil, boostLevel: nextLevel } as any,
      select: { id: true, isBoosted: true, boostLevel: true, boostUntil: true } as any,
    })) as any

    return NextResponse.json({ updated })
  } catch (error) {
    console.error("POST /api/stripe/confirm error:", error)
    return NextResponse.json({ error: "Failed to confirm payment" }, { status: 500 })
  }
}
