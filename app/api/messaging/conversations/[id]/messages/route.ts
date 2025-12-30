"use server"

import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { broadcastToUsers, ensureWSServer } from "@/lib/ws-server"

const sendSchema = z.object({
  content: z.string().min(1),
})

export async function GET(_: Request, { params }: { params: { id: string } }) {
  ensureWSServer()
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const limit = 50
  const url = new URL(_.url)
  const cursor = url.searchParams.get("cursor") || undefined

  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: params.id,
        participants: { some: { userId: session.sub } },
      },
    })
    if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const participant = await (prisma.conversationParticipant as any).findFirst({
      where: { conversationId: params.id, userId: session.sub },
      select: { clearedAt: true, hiddenAt: true },
    })

    const clearedAt = (participant as any)?.clearedAt ? new Date((participant as any).clearedAt) : null
    const hiddenAt = (participant as any)?.hiddenAt ? new Date((participant as any).hiddenAt) : null
    const threshold = clearedAt && hiddenAt ? (clearedAt > hiddenAt ? clearedAt : hiddenAt) : clearedAt ?? hiddenAt

    const messages = await prisma.message.findMany({
      where: {
        conversationId: params.id,
        ...(threshold ? { createdAt: { gt: threshold } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    })

    // Mark messages as delivered when the recipient fetches them
    const otherMessageIds = messages
      .filter((m) => m.senderId !== session.sub && !m.deliveredAt)
      .map((m) => m.id)

    if (otherMessageIds.length) {
      const deliveredAt = new Date()
      await prisma.message.updateMany({
        where: { id: { in: otherMessageIds } },
        data: { deliveredAt },
      })
      messages.forEach((m) => {
        if (otherMessageIds.includes(m.id)) {
          m.deliveredAt = deliveredAt
        }
      })
    }

    return NextResponse.json({
      messages: messages
        .map((m) => ({
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId,
          content: m.content,
          timestamp: m.createdAt.toISOString(),
          readAt: m.readAt ? m.readAt.toISOString() : null,
          deliveredAt: m.deliveredAt ? m.deliveredAt.toISOString() : null,
          type: "text",
        }))
        .reverse(), // ascending for UI
      nextCursor: messages.length === limit ? messages[messages.length - 1].id : null,
    })
  } catch (error) {
    console.error("GET /api/messaging/conversations/[id]/messages error:", error)
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  ensureWSServer()
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = sendSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 })

    const conversation = await prisma.conversation.findFirst({
      where: { id: params.id, participants: { some: { userId: session.sub } } },
    })
    if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (conversation.status !== "ACCEPTED") {
      return NextResponse.json({ error: "Conversation is pending. Wait for acceptance." }, { status: 403 })
    }

    await (prisma.conversationParticipant as any).updateMany({
      where: { conversationId: params.id, userId: session.sub },
      data: { hiddenAt: null, clearedAt: null },
    })

    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId: params.id },
      select: { userId: true },
    })
    const recipientIds = participants.map((p) => p.userId).filter((id) => id !== session.sub)

    const message = await prisma.message.create({
      data: {
        conversationId: params.id,
        senderId: session.sub,
        content: parsed.data.content.trim(),
        type: "TEXT",
      },
    })

    // Mark delivered immediately when a recipient exists
    let deliveredAt: Date | null = null
    if (recipientIds.length > 0) {
      deliveredAt = new Date()
      await prisma.message.update({ where: { id: message.id }, data: { deliveredAt } })
      message.deliveredAt = deliveredAt
    }

    await prisma.conversation.update({
      where: { id: params.id },
      data: { updatedAt: new Date() },
    })

    // broadcast to participants
    const payload = {
      type: "message:new",
      message: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        content: message.content,
        timestamp: message.createdAt.toISOString(),
        readAt: message.readAt ? message.readAt.toISOString() : null,
        deliveredAt: message.deliveredAt ? message.deliveredAt.toISOString() : null,
        type: "text",
      },
    }
    broadcastToUsers(recipientIds, payload)
    broadcastToUsers([session.sub], payload)

    return NextResponse.json({
      message: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        content: message.content,
        timestamp: message.createdAt.toISOString(),
        readAt: message.readAt ? message.readAt.toISOString() : null,
        deliveredAt: message.deliveredAt ? message.deliveredAt.toISOString() : null,
        type: "text",
      },
    })
  } catch (error) {
    console.error("POST /api/messaging/conversations/[id]/messages error:", error)
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
  }
}
