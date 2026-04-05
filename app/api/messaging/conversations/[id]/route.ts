"use server"

import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

export async function DELETE(_: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: params.id, participants: { some: { userId: session.sub } } },
      select: { id: true },
    })

    if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const hiddenAt = new Date()
    await prisma.conversationParticipant.updateMany({
      where: { conversationId: params.id, userId: session.sub },
      data: { hiddenAt },
    })

    return NextResponse.json({ success: true, hiddenAt: hiddenAt.toISOString() })
  } catch (error) {
    console.error("DELETE /api/messaging/conversations/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 })
  }
}
