"use server"

import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

const createSchema = z.object({
  userId: z.string().min(1),
  message: z.string().optional(),
})

async function mapConversation(conv: any, currentUserId: string) {
  const selfParticipant = conv.participants?.find((p: any) => p.userId === currentUserId)
  const clearedAt = selfParticipant?.clearedAt ? new Date(selfParticipant.clearedAt) : null
  const hiddenAt = selfParticipant?.hiddenAt ? new Date(selfParticipant.hiddenAt) : null

  if (hiddenAt) {
    const newestAfterHidden = await prisma.message.findFirst({
      where: { conversationId: conv.id, createdAt: { gt: hiddenAt } },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    })
    if (!newestAfterHidden) return null
  }

  const threshold = clearedAt && hiddenAt ? (clearedAt > hiddenAt ? clearedAt : hiddenAt) : clearedAt ?? hiddenAt

  const unreadCount = await prisma.message.count({
    where: {
      conversationId: conv.id,
      senderId: { not: currentUserId },
      readAt: null,
      ...(threshold ? { createdAt: { gt: threshold } } : {}),
    },
  })

  const lastMessageRaw = threshold
    ? await prisma.message.findFirst({
        where: { conversationId: conv.id, createdAt: { gt: threshold } },
        orderBy: { createdAt: "desc" },
      })
    : conv.messages?.[0]

  const lastMessage = lastMessageRaw
    ? {
        id: lastMessageRaw.id,
        conversationId: lastMessageRaw.conversationId,
        senderId: lastMessageRaw.senderId,
        content: lastMessageRaw.content,
        timestamp: lastMessageRaw.createdAt.toISOString(),
        readAt: lastMessageRaw.readAt ? lastMessageRaw.readAt.toISOString() : null,
        type: "text",
      }
    : undefined

  const now = Date.now()
  const ONLINE_WINDOW_MS = 2 * 60 * 1000

  return {
    id: conv.id,
    status: conv.status,
    requestedBy: conv.requestedBy,
    updatedAt: conv.updatedAt.toISOString(),
    createdAt: conv.createdAt.toISOString(),
    participants:
      conv.participants?.map((p: any) => {
        const userLastSeen = p.user.lastSeenAt ? new Date(p.user.lastSeenAt).getTime() : 0
        const fallback = p.user.updatedAt ? new Date(p.user.updatedAt).getTime() : 0
        const lastSeenMs = Math.max(userLastSeen, fallback)
        return {
          id: p.user.id,
          name: p.user.name,
          avatar: p.user.avatarUrl ?? undefined,
          location: p.user.location ?? null,
          lastSeen: new Date(lastSeenMs).toISOString(),
          isOnline: now - lastSeenMs < ONLINE_WINDOW_MS,
        }
      }) ?? [],
    lastMessage,
    unreadCount,
  }
}

export async function GET() {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId: session.sub },
        },
      },
      include: {
        participants: { select: { userId: true, clearedAt: true, hiddenAt: true, user: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    })

    const mapped = (await Promise.all(conversations.map((c) => mapConversation(c, session.sub)))).filter(Boolean)
    return NextResponse.json({ conversations: mapped })
  } catch (error) {
    console.error("GET /api/messaging/conversations error:", error)
    return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 })

    const { userId, message } = parsed.data
    if (userId === session.sub) return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 })

    const [currentUser, otherUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.sub } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ])
    if (!otherUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

    // Location gating if both have locations
    const currentLocation = (currentUser as any)?.location?.toString().trim().toLowerCase()
    const otherLocation = (otherUser as any)?.location?.toString().trim().toLowerCase()
    if (currentLocation && otherLocation && currentLocation !== otherLocation) {
      return NextResponse.json({ error: "Messaging is limited to your city/community." }, { status: 403 })
    }

    const existing = await prisma.conversation.findFirst({
      where: {
        participants: { some: { userId: session.sub } },
        AND: [{ participants: { some: { userId } } }],
      },
      include: {
        participants: { select: { userId: true, clearedAt: true, hiddenAt: true, user: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    })

    if (existing) {
      await (prisma.conversationParticipant as any).updateMany({
        where: { conversationId: existing.id, userId: session.sub },
        data: { hiddenAt: null, clearedAt: null },
      })

      const refreshed = await prisma.conversation.findFirst({
        where: { id: existing.id },
        include: {
          participants: { select: { userId: true, clearedAt: true, hiddenAt: true, user: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      })

      return NextResponse.json({ conversation: refreshed ? await mapConversation(refreshed, session.sub) : null })
    }

    const created = await prisma.conversation.create({
      data: {
        status: "PENDING",
        requestedBy: session.sub,
        participants: {
          create: [{ userId: session.sub }, { userId }],
        },
        messages: {
          create: {
            senderId: session.sub,
            content: message?.trim() || "I'd like to chat about your post.",
            type: "TEXT",
          },
        },
      },
      include: {
        participants: { select: { userId: true, clearedAt: true, hiddenAt: true, user: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    })

    return NextResponse.json({ conversation: await mapConversation(created, session.sub) }, { status: 201 })
  } catch (error) {
    console.error("POST /api/messaging/conversations error:", error)
    return NextResponse.json({ error: "Failed to start conversation" }, { status: 500 })
  }
}
