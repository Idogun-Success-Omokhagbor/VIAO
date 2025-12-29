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

    const updated = await prisma.conversation.update({
      where: { id: params.id },
      data: { status: "DECLINED" },
    })

    return NextResponse.json({ success: true, status: updated.status })
  } catch (error) {
    console.error("POST /api/messaging/conversations/[id]/decline error:", error)
    return NextResponse.json({ error: "Failed to decline request" }, { status: 500 })
  }
}
