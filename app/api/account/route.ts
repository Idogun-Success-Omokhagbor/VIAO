import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { clearSessionCookie } from "@/lib/session"

export async function DELETE() {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await prisma.$transaction(async (tx) => {
      // Delete dependent records first to avoid FK constraint errors.
      await tx.rsvp.deleteMany({ where: { userId: session.sub } })
      await tx.rsvp.deleteMany({ where: { event: { organizerId: session.sub } } })

      await tx.comment.deleteMany({ where: { authorId: session.sub } })
      await tx.comment.deleteMany({ where: { post: { authorId: session.sub } } })
      await tx.communityPost.deleteMany({ where: { authorId: session.sub } })

      await tx.message.deleteMany({ where: { senderId: session.sub } })
      await tx.conversationParticipant.deleteMany({ where: { userId: session.sub } })

      // If the user requested any conversations, clear the requester reference.
      await tx.conversation.updateMany({
        where: { requestedBy: session.sub },
        data: { requestedBy: null },
      })

      await tx.notification.deleteMany({ where: { userId: session.sub } })
      await tx.passwordResetToken.deleteMany({ where: { userId: session.sub } })
      await (tx as any).pushSubscription.deleteMany({ where: { userId: session.sub } })
      await (tx as any).session.deleteMany({ where: { userId: session.sub } })

      await tx.event.deleteMany({ where: { organizerId: session.sub } })

      await tx.user.delete({ where: { id: session.sub } })
    })

    const res = NextResponse.json({ success: true })
    clearSessionCookie(res)
    return res
  } catch (error) {
    console.error("DELETE /api/account error:", error)
    const isDev = process.env.NODE_ENV === "development"
    const details =
      isDev && error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            code: (error as any)?.code,
            meta: (error as any)?.meta,
          }
        : undefined
    return NextResponse.json({ error: "Failed to delete account", details }, { status: 500 })
  }
}
