"use server"

import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: params.id, participants: { some: { userId: session.sub } } },
      select: { id: true },
    })

    if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const clearedAt = new Date()
    await (prisma.conversationParticipant as any).updateMany({
      where: { conversationId: params.id, userId: session.sub },
      data: { clearedAt, hiddenAt: null },
    })

    return NextResponse.json({ success: true, clearedAt: clearedAt.toISOString() })
  } catch (error) {
    console.error("POST /api/messaging/conversations/[id]/clear error:", error)
    return NextResponse.json({ error: "Failed to clear chat" }, { status: 500 })
  }
}
