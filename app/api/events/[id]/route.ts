import { NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

const eventUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  date: z.string().optional(), // ISO
  time: z.string().optional(),
  location: z.string().min(1).optional(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  venue: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  category: z.string().min(1).optional(),
  imageUrl: z.string().optional().or(z.literal("")),
  imageUrls: z.array(z.string().min(1)).max(5).optional(),
  price: z.number().int().optional().nullable(),
  maxAttendees: z.number().int().positive().optional().nullable(),
  isBoosted: z.boolean().optional(),
  boostUntil: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  isCancelled: z.boolean().optional(),
})

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
    organizerAvatarUrl: event.organizer?.avatarUrl ?? null,
    attendeesCount,
    isGoing: rsvp ? rsvp.status === "GOING" : false,
    rsvpStatus: rsvp ? (rsvp.status as any) : null,
    isSaved,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  }
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser()
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: { organizer: true, rsvps: true, saves: true },
    })
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (event.status === "DRAFT" && event.organizerId !== session?.sub) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json({ event: mapEvent(event, session?.sub) })
  } catch (error) {
    console.error("GET /api/events/[id] error:", error)
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role !== "ORGANIZER") return NextResponse.json({ error: "Only organizers can edit events" }, { status: 403 })

  const body = await req.json()
  const parsed = eventUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid event data" }, { status: 400 })

  try {
    const existing = await prisma.event.findUnique({ where: { id: params.id }, include: { rsvps: true } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (existing.organizerId !== session.sub) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const data = parsed.data
    const imageUrls = Array.isArray(data.imageUrls) ? data.imageUrls.slice(0, 5) : undefined
    const primaryImageUrl =
      data.imageUrl === "" ? null : (data.imageUrl && data.imageUrl.length > 0 ? data.imageUrl : imageUrls?.[0])

    const hasRsvps = Array.isArray(existing.rsvps) && existing.rsvps.length > 0
    if (hasRsvps) {
      const attemptedLockedFields =
        data.date !== undefined ||
        data.time !== undefined ||
        data.location !== undefined ||
        data.category !== undefined ||
        data.price !== undefined ||
        data.maxAttendees !== undefined ||
        data.startsAt !== undefined ||
        data.endsAt !== undefined ||
        data.city !== undefined ||
        data.venue !== undefined ||
        data.address !== undefined ||
        data.lat !== undefined ||
        data.lng !== undefined

      if (attemptedLockedFields) {
        return NextResponse.json(
          { error: "This event already has RSVPs. Date/time/location/capacity/price cannot be edited." },
          { status: 400 },
        )
      }
    }

    const startsAt = data.startsAt ? new Date(data.startsAt) : data.startsAt === null ? null : undefined
    const endsAt = data.endsAt ? new Date(data.endsAt) : data.endsAt === null ? null : undefined

    const updateData: Prisma.EventUpdateInput = {
      title: data.title,
      description: data.description,
      date: data.date ? new Date(data.date) : undefined,
      timeLabel: data.time,
      location: data.location,
      startsAt,
      endsAt,
      city: data.city ?? undefined,
      venue: data.venue ?? undefined,
      address: data.address ?? undefined,
      lat: data.lat ?? undefined,
      lng: data.lng ?? undefined,
      status: data.status as any,
      isCancelled: data.isCancelled,
      cancelledAt: data.isCancelled === true ? new Date() : data.isCancelled === false ? null : undefined,
      category: data.category,
      imageUrl: primaryImageUrl === undefined ? undefined : primaryImageUrl,
      imageUrls: imageUrls === undefined ? undefined : { set: imageUrls },
      price: data.price ?? undefined,
      isBoosted: data.isBoosted,
      boostUntil: data.boostUntil ? new Date(data.boostUntil) : data.boostUntil === null ? null : undefined,
      maxAttendees: data.maxAttendees ?? undefined,
    }

    const updated = await prisma.event.update({
      where: { id: params.id },
      data: updateData,
      include: { organizer: true, rsvps: true, saves: true },
    })

    return NextResponse.json({ event: mapEvent(updated, session.sub) })
  } catch (error) {
    console.error("PUT /api/events/[id] error:", error)
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role !== "ORGANIZER") return NextResponse.json({ error: "Only organizers can delete events" }, { status: 403 })

  try {
    const existing = await prisma.event.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (existing.organizerId !== session.sub) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    await prisma.event.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/events/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 })
  }
}
