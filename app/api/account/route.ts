import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { clearSessionCookie } from "@/lib/session"

export async function DELETE() {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // Delete dependent records first to avoid FK constraint errors.
    await prisma.rsvp.deleteMany({ where: { userId: session.sub } })

    await prisma.comment.deleteMany({ where: { authorId: session.sub } })
    await prisma.communityPost.deleteMany({ where: { authorId: session.sub } })

    await prisma.message.deleteMany({ where: { senderId: session.sub } })
    await prisma.conversationParticipant.deleteMany({ where: { userId: session.sub } })

    await prisma.event.deleteMany({ where: { organizerId: session.sub } })

    await prisma.user.delete({ where: { id: session.sub } })

    const res = NextResponse.json({ success: true })
    clearSessionCookie(res)
    return res
  } catch (error) {
    console.error("DELETE /api/account error:", error)
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}
