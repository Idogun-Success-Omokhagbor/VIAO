import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role !== "ORGANIZER") return NextResponse.json({ error: "Only organizers" }, { status: 403 })

  const event = await prisma.event.findUnique({ where: { id: params.id }, select: { id: true, organizerId: true } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (event.organizerId !== session.sub) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const rsvps = await prisma.rsvp.findMany({
      where: { eventId: params.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    })

    return NextResponse.json({
      rsvps: rsvps.map((r) => ({
        id: r.id,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        user: {
          id: r.user.id,
          name: r.user.name,
          email: r.user.email,
          avatarUrl: r.user.avatarUrl ?? null,
        },
      })),
    })
  } catch (error) {
    console.error("GET /api/events/[id]/attendees error:", error)
    return NextResponse.json({ error: "Failed to fetch attendees" }, { status: 500 })
  }
}
