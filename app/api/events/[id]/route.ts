import { NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"

import { toPrismaEventStatus } from "@/lib/event-enums"
import { eventClientInclude, mapEventForClient } from "@/lib/event-response"
import { storedImageInputSchema } from "@/lib/image-schemas"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

const dateTimeStringSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date")

const eventUpdateSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  date: dateTimeStringSchema.optional(),
  time: z.string().max(50).optional(),
  location: z.string().min(1).max(200).optional(),
  startsAt: dateTimeStringSchema.optional().nullable(),
  endsAt: dateTimeStringSchema.optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  venue: z.string().max(120).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  lat: z.number().finite().gte(-90).lte(90).optional().nullable(),
  lng: z.number().finite().gte(-180).lte(180).optional().nullable(),
  category: z.string().min(1).max(80).optional(),
  imageUrl: storedImageInputSchema.optional().or(z.literal("")),
  imageUrls: z.array(storedImageInputSchema).max(5).optional(),
  price: z.number().int().nonnegative().optional().nullable(),
  maxAttendees: z.number().int().positive().optional().nullable(),
  isBoosted: z.boolean().optional(),
  boostUntil: dateTimeStringSchema.optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  isCancelled: z.boolean().optional(),
})

export async function GET(_: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getSessionUser()
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: eventClientInclude,
    })
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (event.status === "DRAFT" && event.organizerId !== session?.sub) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    return NextResponse.json({ event: mapEventForClient(event, session?.sub) })
  } catch (error) {
    console.error("GET /api/events/[id] error:", error)
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 })
  }
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role !== "ORGANIZER") return NextResponse.json({ error: "Only organizers can edit events" }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid event data" }, { status: 400 })
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
    if (startsAt && endsAt && endsAt.getTime() < startsAt.getTime()) {
      return NextResponse.json({ error: "Event end time must be after the start time" }, { status: 400 })
    }

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
      status: toPrismaEventStatus(data.status),
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
      include: eventClientInclude,
    })

    return NextResponse.json({ event: mapEventForClient(updated, session.sub) })
  } catch (error) {
    console.error("PUT /api/events/[id] error:", error)
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 })
  }
}

export async function DELETE(_: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
