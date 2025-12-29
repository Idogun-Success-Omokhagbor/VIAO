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
    })
    if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 })

    await prisma.message.updateMany({
      where: {
        conversationId: params.id,
        senderId: { not: session.sub },
        readAt: null,
      },
      data: { readAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/messaging/conversations/[id]/read error:", error)
    return NextResponse.json({ error: "Failed to mark read" }, { status: 500 })
  }
}
