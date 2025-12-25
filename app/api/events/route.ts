"use server"

import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.string(), // ISO
  time: z.string().optional(),
  location: z.string().min(1),
  category: z.string().min(1),
  imageUrl: z.string().url().optional().or(z.literal("")),
  price: z.number().int().optional().nullable(),
  maxAttendees: z.number().int().positive().optional().nullable(),
  isBoosted: z.boolean().optional(),
  boostUntil: z.string().optional().nullable(),
})

function mapEvent(event: any, sessionUserId?: string) {
  const isBoostExpired = event.boostUntil ? event.boostUntil.getTime() <= Date.now() : false
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date.toISOString(),
    time: event.timeLabel ?? undefined,
    location: event.location,
    category: event.category,
    imageUrl: event.imageUrl ?? null,
    price: event.price ?? null,
    isBoosted: isBoostExpired ? false : event.isBoosted,
    boostUntil: isBoostExpired ? null : event.boostUntil ? event.boostUntil.toISOString() : null,
    maxAttendees: event.maxAttendees ?? null,
    organizerId: event.organizerId,
    organizerName: event.organizer?.name,
    attendeesCount: event.rsvps?.length ?? 0,
    isGoing: sessionUserId ? event.rsvps?.some((r: any) => r.userId === sessionUserId) ?? false : false,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  }
}

export async function GET() {
  const session = await getSessionUser()
  try {
    const events = await prisma.event.findMany({
      include: {
        organizer: true,
        rsvps: true,
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
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = eventSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event data" }, { status: 400 })
  }

  const data = parsed.data

  try {
    const created = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        date: new Date(data.date),
        timeLabel: data.time,
        location: data.location,
        category: data.category,
        imageUrl: data.imageUrl || undefined,
        price: data.price ?? undefined,
        isBoosted: data.isBoosted ?? false,
        boostUntil: data.boostUntil ? new Date(data.boostUntil) : undefined,
        maxAttendees: data.maxAttendees ?? undefined,
        organizerId: session.sub,
      },
      include: { organizer: true, rsvps: true },
    })

    return NextResponse.json({ event: mapEvent(created) }, { status: 201 })
  } catch (error) {
    console.error("POST /api/events error:", error)
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 })
  }
}
