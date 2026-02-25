import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

function formatIcsDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  )
}

function sanitizeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
}

function toSafeFilename(value: string) {
  const base = value.replace(/[^a-z0-9\-_ ]/gi, "").trim().slice(0, 60)
  return `${base || "event"}.ics`
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser()

  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        timeLabel: true,
        startsAt: true,
        endsAt: true,
        city: true,
        venue: true,
        address: true,
        location: true,
        status: true,
        organizerId: true,
      },
    })

    if (!event) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    if (event.status === "DRAFT" && event.organizerId !== session?.sub) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const start = new Date(event.startsAt ?? event.date)
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: "Invalid event date" }, { status: 400 })
    }

    const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const now = new Date()
    const uid = `${event.id}@viao`
    const location = [event.venue, event.address, event.city, event.location].filter(Boolean).join(", ")
    const description = [
      event.description || "",
      event.timeLabel ? `Time: ${event.timeLabel}` : "",
    ]
      .filter(Boolean)
      .join("\n")

    const ics =
      "BEGIN:VCALENDAR\r\n" +
      "VERSION:2.0\r\n" +
      "PRODID:-//Viao//My Events//EN\r\n" +
      "CALSCALE:GREGORIAN\r\n" +
      "METHOD:PUBLISH\r\n" +
      "BEGIN:VEVENT\r\n" +
      `UID:${sanitizeIcsText(uid)}\r\n` +
      `DTSTAMP:${formatIcsDate(now)}\r\n` +
      `DTSTART:${formatIcsDate(start)}\r\n` +
      `DTEND:${formatIcsDate(end)}\r\n` +
      `SUMMARY:${sanitizeIcsText(event.title)}\r\n` +
      `DESCRIPTION:${sanitizeIcsText(description)}\r\n` +
      `LOCATION:${sanitizeIcsText(location)}\r\n` +
      "END:VEVENT\r\n" +
      "END:VCALENDAR\r\n"

    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${toSafeFilename(event.title)}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("GET /api/events/[id]/calendar error:", error)
    return NextResponse.json({ error: "Failed to generate calendar file" }, { status: 500 })
  }
}
