import { NextResponse } from "next/server"

import { eventCardSelect, mapEventCardForClient } from "@/lib/event-response"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

export async function GET() {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const rows = await prisma.eventSave.findMany({
      where: {
        userId: session.sub,
        event: { status: "PUBLISHED" },
      },
      select: {
        event: {
          select: eventCardSelect,
        },
      },
    })

    const events = rows
      .map((row) =>
        mapEventCardForClient(row.event, {
          isSaved: true,
        }),
      )
      .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())

    return NextResponse.json({ events })
  } catch (error) {
    console.error("GET /api/events/me/saved error:", error)
    return NextResponse.json({ error: "Failed to fetch saved events" }, { status: 500 })
  }
}
