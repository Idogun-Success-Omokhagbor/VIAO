import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

function mapEvent(event: any, sessionUserId?: string) {
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
  const rsvp = sessionUserId ? (event.rsvps?.find((r: any) => r.userId === sessionUserId) ?? null) : null
  const isSaved = sessionUserId ? (event.saves?.some((s: any) => s.userId === sessionUserId) ?? false) : false
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
    attendeesCount,
    isGoing: rsvp ? rsvp.status === "GOING" : false,
    rsvpStatus: rsvp ? (rsvp.status as any) : null,
    isSaved,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  }
}

export async function GET() {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const events = await prisma.event.findMany({
      where: { saves: { some: { userId: session.sub } }, status: "PUBLISHED" },
      include: { organizer: true, rsvps: true, saves: true },
      orderBy: { date: "asc" },
    })

    return NextResponse.json({ events: events.map((e) => mapEvent(e, session.sub)) })
  } catch (error) {
    console.error("GET /api/events/me/saved error:", error)
    return NextResponse.json({ error: "Failed to fetch saved events" }, { status: 500 })
  }
}
