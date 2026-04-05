import { NextResponse } from "next/server"

import { eventClientInclude, mapEventForClient } from "@/lib/event-response"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

export async function GET() {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role !== "ORGANIZER") return NextResponse.json({ error: "Only organizers" }, { status: 403 })

  try {
    const events = await prisma.event.findMany({
      where: { organizerId: session.sub },
      include: eventClientInclude,
      orderBy: { date: "desc" },
    })

    return NextResponse.json({ events: events.map((event) => mapEventForClient(event, session.sub)) })
  } catch (error) {
    console.error("GET /api/events/me/organized error:", error)
    return NextResponse.json({ error: "Failed to fetch organizer events" }, { status: 500 })
  }
}
