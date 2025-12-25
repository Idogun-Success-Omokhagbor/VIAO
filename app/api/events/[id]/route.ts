"use server"

import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

const eventUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  date: z.string().optional(), // ISO
  time: z.string().optional(),
  location: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
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

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionUser()
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: { organizer: true, rsvps: true },
    })
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ event: mapEvent(event, session?.sub) })
  } catch (error) {
    console.error("GET /api/events/[id] error:", error)
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = eventUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid event data" }, { status: 400 })

  try {
    const existing = await prisma.event.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (existing.organizerId !== session.sub) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const data = parsed.data
    const updated = await prisma.event.update({
      where: { id: params.id },
      data: {
        title: data.title,
        description: data.description,
        date: data.date ? new Date(data.date) : undefined,
        timeLabel: data.time,
        location: data.location,
        category: data.category,
        imageUrl: data.imageUrl === "" ? null : data.imageUrl ?? undefined,
        price: data.price ?? undefined,
        isBoosted: data.isBoosted,
        boostUntil: data.boostUntil ? new Date(data.boostUntil) : data.boostUntil === null ? null : undefined,
        maxAttendees: data.maxAttendees ?? undefined,
      },
      include: { organizer: true, rsvps: true },
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
