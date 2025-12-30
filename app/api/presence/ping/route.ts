"use server"

import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { ensureWSServer } from "@/lib/ws-server"

export async function POST() {
  ensureWSServer()
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    if (session.sid) {
      try {
        await (prisma as any).session.update({
          where: { id: session.sid },
          data: { lastSeenAt: new Date() },
          select: { id: true },
        })
      } catch {
      }
    }

    const updated = await (prisma.user as any).update({
      where: { id: session.sub },
      data: { lastSeenAt: new Date() },
      select: { lastSeenAt: true },
    })

    return NextResponse.json({ success: true, lastSeenAt: updated.lastSeenAt?.toISOString() ?? null })
  } catch (error) {
    console.error("POST /api/presence/ping error:", error)
    return NextResponse.json({ error: "Failed to update presence" }, { status: 500 })
  }
}
