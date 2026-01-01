import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

function mapSafeImages(eventId: string, imageUrl: string | null, imageUrls: unknown) {
  const safeImageUrl = typeof imageUrl === "string" && imageUrl.startsWith("data:") ? `/api/events/${eventId}/image` : (imageUrl ?? null)
  const safeImageUrls = Array.isArray(imageUrls)
    ? imageUrls
        .map((u: unknown, idx: number) =>
          typeof u === "string" && u.startsWith("data:") ? `/api/events/${eventId}/image?index=${idx}` : u,
        )
        .filter((u: unknown) => typeof u === "string" && u.length > 0)
    : []

  return {
    imageUrl: safeImageUrl,
    imageUrls: safeImageUrls.length > 0 ? safeImageUrls : safeImageUrl ? [safeImageUrl] : [],
  }
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser()
  if (!session || session.role !== "ADMIN") return forbidden()

  const id = typeof params?.id === "string" ? params.id : ""
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 })
  }

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      date: true,
      timeLabel: true,
      location: true,
      startsAt: true,
      endsAt: true,
      city: true,
      venue: true,
      address: true,
      lat: true,
      lng: true,
      status: true,
      isCancelled: true,
      cancelledAt: true,
      category: true,
      imageUrl: true,
      imageUrls: true,
      price: true,
      isBoosted: true,
      boostLevel: true,
      boostUntil: true,
      maxAttendees: true,
      createdAt: true,
      updatedAt: true,
      organizerId: true,
      organizer: { select: { id: true, name: true, email: true } },
      _count: { select: { rsvps: true, saves: true, reports: true } },
    },
  })

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  const openReports = await prisma.eventReport.count({ where: { eventId: id, status: "OPEN" } })

  const safeImages = mapSafeImages(event.id, event.imageUrl ?? null, event.imageUrls)

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date.toISOString(),
      timeLabel: event.timeLabel ?? null,
      location: event.location,
      startsAt: event.startsAt ? event.startsAt.toISOString() : null,
      endsAt: event.endsAt ? event.endsAt.toISOString() : null,
      city: event.city,
      venue: event.venue,
      address: event.address,
      lat: event.lat,
      lng: event.lng,
      status: event.status,
      isCancelled: event.isCancelled,
      cancelledAt: event.cancelledAt ? event.cancelledAt.toISOString() : null,
      category: event.category,
      imageUrl: safeImages.imageUrl,
      imageUrls: safeImages.imageUrls,
      price: event.price ?? null,
      isBoosted: event.isBoosted,
      boostLevel: event.boostLevel,
      boostUntil: event.boostUntil ? event.boostUntil.toISOString() : null,
      maxAttendees: event.maxAttendees ?? null,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      organizerId: event.organizerId,
      organizer: event.organizer,
      counts: {
        rsvps: Number((event as any)._count?.rsvps ?? 0),
        saves: Number((event as any)._count?.saves ?? 0),
        reports: Number((event as any)._count?.reports ?? 0),
        openReports: Number(openReports ?? 0),
      },
    },
  })
}
