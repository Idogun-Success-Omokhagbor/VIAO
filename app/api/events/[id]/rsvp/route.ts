import { NextResponse } from "next/server"
import { z } from "zod"

import { toPrismaRsvpStatus } from "@/lib/event-enums"
import { eventClientInclude, mapEventForClient } from "@/lib/event-response"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

const schema = z
  .object({
    status: z.enum(["GOING", "MAYBE", "NOT_GOING"]).optional(),
  })
  .optional()

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json().catch(() => undefined)
    const parsed = schema?.safeParse(body)
    if (parsed && !parsed.success) {
      return NextResponse.json({ error: "Invalid RSVP" }, { status: 400 })
    }
    const status = parsed?.success ? parsed.data?.status ?? "GOING" : "GOING"

    const eventForRules = await prisma.event.findUnique({ where: { id: params.id }, select: { startsAt: true, date: true, isCancelled: true, maxAttendees: true, status: true } })
    if (!eventForRules) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (eventForRules.isCancelled) return NextResponse.json({ error: "Event is cancelled" }, { status: 400 })
    if (eventForRules.status === "DRAFT") return NextResponse.json({ error: "Not found" }, { status: 404 })

    const startsAt = eventForRules.startsAt ?? eventForRules.date
    if (startsAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "RSVP is closed for this event" }, { status: 400 })
    }

    if (status === "GOING" && typeof eventForRules.maxAttendees === "number") {
      const goingCount = await prisma.rsvp.count({ where: { eventId: params.id, status: "GOING" } })
      if (goingCount >= eventForRules.maxAttendees) {
        return NextResponse.json({ error: "Event is full" }, { status: 400 })
      }
    }

    await prisma.rsvp.upsert({
      where: { userId_eventId: { userId: session.sub, eventId: params.id } },
      create: { userId: session.sub, eventId: params.id, status: toPrismaRsvpStatus(status) ?? "GOING" },
      update: { status: toPrismaRsvpStatus(status) ?? "GOING" },
    })

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: eventClientInclude,
    })
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json({ event: mapEventForClient(event, session.sub) })
  } catch (error) {
    console.error("POST /api/events/[id]/rsvp error:", error)
    return NextResponse.json({ error: "Failed to RSVP" }, { status: 500 })
  }
}

export async function DELETE(_: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await prisma.rsvp.delete({
      where: { userId_eventId: { userId: session.sub, eventId: params.id } },
    })
  } catch {
    // ignore missing RSVP
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: eventClientInclude,
    })
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ event: mapEventForClient(event, session.sub) })
  } catch (error) {
    console.error("DELETE /api/events/[id]/rsvp error:", error)
    return NextResponse.json({ error: "Failed to cancel RSVP" }, { status: 500 })
  }
}
