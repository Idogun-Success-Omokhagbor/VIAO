"use server"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role !== "ORGANIZER") return NextResponse.json({ error: "Only organizers can boost events" }, { status: 403 })

  try {
    const existing = await prisma.event.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (existing.organizerId !== session.sub) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const boostUntil = new Date()
    boostUntil.setDate(boostUntil.getDate() + 7)

    const updated = await prisma.event.update({
      where: { id: params.id },
      data: { isBoosted: true, boostUntil },
      include: { organizer: true, rsvps: true },
    })

    const isBoostExpired = updated.boostUntil ? updated.boostUntil.getTime() <= Date.now() : false

    return NextResponse.json({
      event: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        date: updated.date.toISOString(),
        time: updated.timeLabel ?? undefined,
        location: updated.location,
        category: updated.category,
        imageUrl: updated.imageUrl ?? null,
        price: updated.price ?? null,
        isBoosted: isBoostExpired ? false : updated.isBoosted,
        boostUntil: isBoostExpired ? null : updated.boostUntil ? updated.boostUntil.toISOString() : null,
        maxAttendees: updated.maxAttendees ?? null,
        organizerId: updated.organizerId,
        organizerName: updated.organizer?.name,
        attendeesCount: updated.rsvps?.length ?? 0,
        isGoing: false,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("POST /api/events/[id]/boost error:", error)
    return NextResponse.json({ error: "Failed to boost event" }, { status: 500 })
  }
}
