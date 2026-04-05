import { NextResponse } from "next/server"

import { eventClientInclude, mapEventForClient } from "@/lib/event-response"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

export async function GET() {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const events = await prisma.event.findMany({
      where: { rsvps: { some: { userId: session.sub } }, status: "PUBLISHED" },
      include: eventClientInclude,
      orderBy: { date: "asc" },
    })

    return NextResponse.json({ events: events.map((event) => mapEventForClient(event, session.sub)) })
  } catch (error) {
    console.error("GET /api/events/me/rsvps error:", error)
    return NextResponse.json({ error: "Failed to fetch RSVP events" }, { status: 500 })
  }
}
