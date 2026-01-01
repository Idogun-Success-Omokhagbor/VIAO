import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

const schema = z
  .object({
    status: z.enum(["GOING", "MAYBE", "NOT_GOING"]).optional(),
  })
  .optional()

function mapEvent(event: any, sessionUserId: string) {
  const safeImageUrl =
    typeof event.imageUrl === "string" && event.imageUrl.startsWith("data:")
      ? `/api/events/${event.id}/image`
      : (event.imageUrl ?? null)
  const safeImageUrls = Array.isArray(event.imageUrls)
    ? event.imageUrls
        .map((u: unknown, idx: number) =>
          typeof u === "string" && u.startsWith("data:") ? `/api/events/${event.id}/image?index=${idx}` : u,
        )
        .filter((u: unknown) => typeof u === "string" && u.length > 0)
    : []
  const isBoostExpired = event.boostUntil ? event.boostUntil.getTime() <= Date.now() : false
  const storedBoostLevel = typeof event.boostLevel === "number" ? event.boostLevel : null
  const effectiveBoostLevel = isBoostExpired ? 0 : storedBoostLevel && storedBoostLevel > 0 ? storedBoostLevel : event.isBoosted ? 1 : 0
  const rsvp = event.rsvps?.find((r: any) => r.userId === sessionUserId) ?? null
  const isSaved = event.saves?.some((s: any) => s.userId === sessionUserId) ?? false
  const attendeesCount = Array.isArray(event.rsvps) ? event.rsvps.filter((r: any) => r.status === "GOING").length : 0
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date.toISOString(),
    time: event.timeLabel ?? undefined,
    location: event.location,
    startsAt: event.startsAt ? event.startsAt.toISOString() : null,
    endsAt: event.endsAt ? event.endsAt.toISOString() : null,
    city: event.city ?? null,
    venue: event.venue ?? null,
    address: event.address ?? null,
    lat: event.lat ?? null,
    lng: event.lng ?? null,
    status: event.status,
    isCancelled: event.isCancelled ?? false,
    cancelledAt: event.cancelledAt ? event.cancelledAt.toISOString() : null,
    category: event.category,
    imageUrl: safeImageUrl,
    imageUrls: safeImageUrls,
    price: event.price ?? null,
    isBoosted: isBoostExpired ? false : event.isBoosted,
    boostLevel: effectiveBoostLevel,
    boostUntil: isBoostExpired ? null : event.boostUntil ? event.boostUntil.toISOString() : null,
    maxAttendees: event.maxAttendees ?? null,
    organizerId: event.organizerId,
    organizerName: event.organizer?.name,
    organizerAvatarUrl: event.organizer?.avatarUrl ?? null,
    attendeesCount,
    isGoing: rsvp ? rsvp.status === "GOING" : false,
    rsvpStatus: rsvp ? (rsvp.status as any) : null,
    isSaved,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json().catch(() => undefined)
    const parsed = schema?.safeParse(body)
    if (parsed && !parsed.success) {
      return NextResponse.json({ error: "Invalid RSVP" }, { status: 400 })
    }
    const status = parsed?.success ? parsed.data?.status ?? "GOING" : "GOING"

    const eventForRules = await prisma.event.findUnique({ where: { id: params.id }, select: { startsAt: true, date: true, isCancelled: true, maxAttendees: true, status: true } })
    if (!eventForRules) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (eventForRules.isCancelled) return NextResponse.json({ error: "Event is cancelled" }, { status: 400 })
    if (eventForRules.status === "DRAFT") return NextResponse.json({ error: "Not found" }, { status: 404 })

    const startsAt = eventForRules.startsAt ?? eventForRules.date
    if (startsAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "RSVP is closed for this event" }, { status: 400 })
    }

    if (status === "GOING" && typeof eventForRules.maxAttendees === "number") {
      const goingCount = await prisma.rsvp.count({ where: { eventId: params.id, status: "GOING" } })
      if (goingCount >= eventForRules.maxAttendees) {
        return NextResponse.json({ error: "Event is full" }, { status: 400 })
      }
    }

    await prisma.rsvp.upsert({
      where: { userId_eventId: { userId: session.sub, eventId: params.id } },
      create: { userId: session.sub, eventId: params.id, status: status as any },
      update: { status: status as any },
    })

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: { organizer: true, rsvps: true, saves: true },
    })
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json({ event: mapEvent(event, session.sub) })
  } catch (error) {
    console.error("POST /api/events/[id]/rsvp error:", error)
    return NextResponse.json({ error: "Failed to RSVP" }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await prisma.rsvp.delete({
      where: { userId_eventId: { userId: session.sub, eventId: params.id } },
    })
  } catch (err) {
    // ignore missing RSVP
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: { organizer: true, rsvps: true, saves: true },
    })
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ event: mapEvent(event, session.sub) })
  } catch (error) {
    console.error("DELETE /api/events/[id]/rsvp error:", error)
    return NextResponse.json({ error: "Failed to cancel RSVP" }, { status: 500 })
  }
}
