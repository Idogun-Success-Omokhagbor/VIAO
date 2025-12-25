"use server"

import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

function mapEvent(event: any, sessionUserId: string) {
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
    isGoing: event.rsvps?.some((r: any) => r.userId === sessionUserId) ?? false,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  }
}

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await prisma.rsvp.upsert({
      where: { userId_eventId: { userId: session.sub, eventId: params.id } },
      create: { userId: session.sub, eventId: params.id, status: "GOING" },
      update: { status: "GOING" },
    })

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: { organizer: true, rsvps: true },
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
      include: { organizer: true, rsvps: true },
    })
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ event: mapEvent(event, session.sub) })
  } catch (error) {
    console.error("DELETE /api/events/[id]/rsvp error:", error)
    return NextResponse.json({ error: "Failed to cancel RSVP" }, { status: 500 })
  }
}
