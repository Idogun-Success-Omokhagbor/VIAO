import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser, revokeOtherSessions } from "@/lib/session"

export async function GET() {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sessions = await prisma.session.findMany({
    where: {
      userId: session.sub,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      userAgent: true,
      ip: true,
      lastSeenAt: true,
      createdAt: true,
      updatedAt: true,
      expiresAt: true,
    },
  })

  return NextResponse.json({
    currentSessionId: session.sid ?? null,
    sessions: sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ip: s.ip,
      lastSeenAt: s.lastSeenAt ? s.lastSeenAt.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
    })),
  })
}

export async function POST() {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!session.sid) return NextResponse.json({ error: "Please sign in again to manage sessions" }, { status: 400 })

  try {
    await revokeOtherSessions(session.sub, session.sid)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/account/sessions error:", error)
    return NextResponse.json({ error: "Failed to sign out other sessions" }, { status: 500 })
  }
}
