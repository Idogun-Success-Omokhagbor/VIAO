import { NextResponse } from "next/server"

import { eventCardSelect, mapEventCardForClient } from "@/lib/event-response"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

export async function GET() {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const rows = await prisma.rsvp.findMany({
      where: {
        userId: session.sub,
        event: { status: "PUBLISHED" },
      },
      select: {
        status: true,
        event: {
          select: eventCardSelect,
        },
      },
    })

    const events = rows
      .map((row) =>
        mapEventCardForClient(row.event, {
          rsvpStatus: row.status,
        }),
      )
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())

    return NextResponse.json({ events })
  } catch (error) {
    console.error("GET /api/events/me/rsvps error:", error)
    return NextResponse.json({ error: "Failed to fetch RSVP events" }, { status: 500 })
  }
}
