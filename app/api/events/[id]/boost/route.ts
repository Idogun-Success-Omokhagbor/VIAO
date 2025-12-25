"use server"

import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

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

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const existing = await prisma.event.findUnique({ where: { id: params.id }, include: { organizer: true, rsvps: true } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (existing.organizerId !== session.sub) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const boostUntil = new Date()
    boostUntil.setHours(boostUntil.getHours() + 24)

    const boosted = await prisma.event.update({
      where: { id: params.id },
      data: { isBoosted: true, boostUntil },
      include: { organizer: true, rsvps: true },
    })

    return NextResponse.json({ event: mapEvent(boosted, session.sub) })
  } catch (error) {
    console.error("POST /api/events/[id]/boost error:", error)
    return NextResponse.json({ error: "Failed to boost event" }, { status: 500 })
  }
}
