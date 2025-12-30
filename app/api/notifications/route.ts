"use server"

import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

const markSchema = z.object({
  ids: z.array(z.string()).optional(),
  markAll: z.boolean().optional(),
})

export async function GET(req: Request) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const limit = Number(url.searchParams.get("limit") || 50)

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 200),
    })

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data,
        readAt: n.readAt ? n.readAt.toISOString() : null,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount: notifications.filter((n) => !n.readAt).length,
    })
  } catch (error) {
    console.error("GET /api/notifications error:", error)
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const json = await req.json()
    const parsed = markSchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 })

    const now = new Date()
    if (parsed.data.markAll) {
      await prisma.notification.updateMany({ where: { userId: session.sub, readAt: null }, data: { readAt: now } })
    } else if (parsed.data.ids?.length) {
      await prisma.notification.updateMany({
        where: { userId: session.sub, id: { in: parsed.data.ids }, readAt: null },
        data: { readAt: now },
      })
    }

    return NextResponse.json({ success: true, readAt: now.toISOString() })
  } catch (error) {
    console.error("POST /api/notifications error:", error)
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 })
  }
}
