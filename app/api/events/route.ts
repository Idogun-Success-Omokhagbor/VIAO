import { NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.string(), // ISO
  time: z.string().optional(),
  location: z.string().min(1),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  venue: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  category: z.string().min(1),
  imageUrl: z.string().optional().or(z.literal("")),
  imageUrls: z.array(z.string().min(1)).max(5).optional(),
  price: z.number().int().optional().nullable(),
  maxAttendees: z.number().int().positive().optional().nullable(),
  isBoosted: z.boolean().optional(),
  boostUntil: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  isCancelled: z.boolean().optional(),
  cancelledAt: z.string().optional().nullable(),
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

export async function GET() {
  const session = await getSessionUser()
  try {
    const events = await prisma.event.findMany({
      where: { status: "PUBLISHED" },
      include: {
        organizer: true,
        rsvps: true,
        saves: true,
      },
      orderBy: { date: "asc" },
    })
    return NextResponse.json({ events: events.map((e) => mapEvent(e, session?.sub)) })
  } catch (error) {
    console.error("GET /api/events error:", error)
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role !== "ORGANIZER") return NextResponse.json({ error: "Only organizers can create events" }, { status: 403 })

  const body = await req.json()
  const parsed = eventSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event data" }, { status: 400 })
  }

  const data = parsed.data

  try {
    const startsAt = data.startsAt ? new Date(data.startsAt) : null
    const endsAt = data.endsAt ? new Date(data.endsAt) : null
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
      status: (data.status as any) ?? "PUBLISHED",
      isCancelled: data.isCancelled ?? false,
      cancelledAt: data.cancelledAt ? new Date(data.cancelledAt) : undefined,
      organizer: { connect: { id: session.sub } },
    }

    const created = await prisma.event.create({
      data: createData,
      include: { organizer: true, rsvps: true, saves: true },
    })

    return NextResponse.json({ event: mapEvent(created) }, { status: 201 })
  } catch (error) {
    console.error("POST /api/events error:", error)
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 })
  }
}
