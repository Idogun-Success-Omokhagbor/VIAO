import { NextResponse } from "next/server"
import { z } from "zod"
import { EventStatus, Prisma } from "@prisma/client"

import { toPrismaEventStatus } from "@/lib/event-enums"
import { eventClientInclude, mapEventForClient, sortEventsForFeed } from "@/lib/event-response"
import { storedImageInputSchema } from "@/lib/image-schemas"
import { prisma } from "@/lib/prisma"
import { buildUpcomingPublishedEventWhere } from "@/lib/public-events"
import { getSessionUser } from "@/lib/session"

const dateTimeStringSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date")

const eventSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  date: dateTimeStringSchema,
  time: z.string().max(50).optional(),
  location: z.string().min(1).max(200),
  startsAt: dateTimeStringSchema.optional().nullable(),
  endsAt: dateTimeStringSchema.optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  venue: z.string().max(120).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  lat: z.number().finite().gte(-90).lte(90).optional().nullable(),
  lng: z.number().finite().gte(-180).lte(180).optional().nullable(),
  category: z.string().min(1).max(80),
  imageUrl: storedImageInputSchema.optional().or(z.literal("")),
  imageUrls: z.array(storedImageInputSchema).max(5).optional(),
  price: z.number().int().nonnegative().optional().nullable(),
  maxAttendees: z.number().int().positive().optional().nullable(),
  isBoosted: z.boolean().optional(),
  boostUntil: dateTimeStringSchema.optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  isCancelled: z.boolean().optional(),
  cancelledAt: dateTimeStringSchema.optional().nullable(),
})

export async function GET() {
  const session = await getSessionUser()
  try {
    const events = await prisma.event.findMany({
      where: buildUpcomingPublishedEventWhere(),
      include: eventClientInclude,
      orderBy: { date: "asc" },
    })

    return NextResponse.json({
      events: sortEventsForFeed(events.map((event) => mapEventForClient(event, session?.sub))),
    })
  } catch (error) {
    console.error("GET /api/events error:", error)
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role !== "ORGANIZER") return NextResponse.json({ error: "Only organizers can create events" }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid event data" }, { status: 400 })
  }
  const parsed = eventSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event data" }, { status: 400 })
  }

  const data = parsed.data

  try {
    const startsAt = data.startsAt ? new Date(data.startsAt) : null
    const endsAt = data.endsAt ? new Date(data.endsAt) : null
    if (startsAt && endsAt && endsAt.getTime() < startsAt.getTime()) {
      return NextResponse.json({ error: "Event end time must be after the start time" }, { status: 400 })
    }
    const imageUrls = Array.isArray(data.imageUrls) ? data.imageUrls.slice(0, 5) : []
    const primaryImageUrl = (data.imageUrl && data.imageUrl.length > 0 ? data.imageUrl : imageUrls[0]) ?? undefined

    const createData: Prisma.EventCreateInput = {
      title: data.title,
      description: data.description,
      date: startsAt ?? new Date(data.date),
      timeLabel: data.time,
      location: data.location,
      startsAt,
      endsAt,
      city: data.city ?? undefined,
      venue: data.venue ?? undefined,
      address: data.address ?? undefined,
      lat: data.lat ?? undefined,
      lng: data.lng ?? undefined,
      category: data.category,
      imageUrl: primaryImageUrl,
      imageUrls: { set: imageUrls },
      price: data.price ?? undefined,
      isBoosted: data.isBoosted ?? false,
      boostUntil: data.boostUntil ? new Date(data.boostUntil) : undefined,
      maxAttendees: data.maxAttendees ?? undefined,
      status: toPrismaEventStatus(data.status) ?? EventStatus.PUBLISHED,
      isCancelled: data.isCancelled ?? false,
      cancelledAt: data.cancelledAt ? new Date(data.cancelledAt) : undefined,
      organizer: { connect: { id: session.sub } },
    }

    const created = await prisma.event.create({
      data: createData,
      include: eventClientInclude,
    })

    return NextResponse.json({ event: mapEventForClient(created) }, { status: 201 })
  } catch (error) {
    console.error("POST /api/events error:", error)
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 })
  }
}
