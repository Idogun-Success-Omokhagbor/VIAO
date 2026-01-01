import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

const schema = z.object({
  reason: z.string().min(1).max(200),
  details: z.string().max(2000).optional(),
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Invalid report" }, { status: 400 })

    const event = await prisma.event.findUnique({ where: { id: params.id }, select: { id: true, title: true } })
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await prisma.eventReport.create({
      data: {
        eventId: params.id,
        reporterId: session.sub,
        reason: parsed.data.reason,
        details: parsed.data.details,
      },
    })

    await prisma.notification.create({
      data: {
        userId: session.sub,
        type: "MESSAGE",
        title: "Report received",
        body: `Thanks for letting us know — we’ll review your report about “${event.title}” shortly.`,
        data: { eventId: params.id },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/events/[id]/report error:", error)
    return NextResponse.json({ error: "Failed to report event" }, { status: 500 })
  }
}
