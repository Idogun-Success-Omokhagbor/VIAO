import { NextResponse } from "next/server"

import { eventClientInclude, mapEventForClient } from "@/lib/event-response"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

export async function POST(_: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const exists = await prisma.event.findUnique({ where: { id: params.id }, select: { id: true, status: true } })
    if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (exists.status === "DRAFT") return NextResponse.json({ error: "Not found" }, { status: 404 })

    await prisma.eventSave.upsert({
      where: { userId_eventId: { userId: session.sub, eventId: params.id } },
      create: { userId: session.sub, eventId: params.id },
      update: {},
    })

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: eventClientInclude,
    })
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json({ event: mapEventForClient(event, session.sub) })
  } catch (error) {
    console.error("POST /api/events/[id]/save error:", error)
    return NextResponse.json({ error: "Failed to save event" }, { status: 500 })
  }
}

export async function DELETE(_: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await prisma.eventSave.deleteMany({ where: { userId: session.sub, eventId: params.id } })

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: eventClientInclude,
    })
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json({ event: mapEventForClient(event, session.sub) })
  } catch (error) {
    console.error("DELETE /api/events/[id]/save error:", error)
    return NextResponse.json({ error: "Failed to unsave event" }, { status: 500 })
  }
}
