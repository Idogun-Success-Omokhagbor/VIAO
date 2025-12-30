"use server"

import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { mapPost } from "../../../../route"
import { createNotification } from "@/lib/notifications"

export async function POST(_: Request, { params }: { params: { id: string; commentId: string } }) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const existing = await prisma.comment.findUnique({ where: { id: params.commentId } })
    if (!existing || existing.postId !== params.id) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const currentLikedBy = Array.isArray(existing.likedBy) ? existing.likedBy : []
    const nextLikedBy = currentLikedBy.includes(session.sub) ? currentLikedBy : [...currentLikedBy, session.sub]

    await prisma.comment.update({
      where: { id: params.commentId },
      data: { likedBy: { set: nextLikedBy } } as any,
    })

    const post = await prisma.communityPost.findUnique({
      where: { id: params.id },
      include: { author: true, comments: { include: { author: true }, orderBy: { createdAt: "desc" } } },
    })
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (existing.authorId && existing.authorId !== session.sub) {
      const actor = await prisma.user.findUnique({ where: { id: session.sub }, select: { name: true } })
      await createNotification({
        userId: existing.authorId,
        type: "LIKE",
        title: `${actor?.name || "Someone"} liked your comment`,
        body: existing.content?.slice(0, 120) ?? "Your comment received a like.",
        data: { postId: params.id, commentId: params.commentId, actorId: session.sub, url: "/community" },
        channel: "PUSH",
      })
    }

    return NextResponse.json({ post: await mapPost(post, session.sub) })
  } catch (error) {
    console.error("POST /api/community/posts/[id]/comments/[commentId]/like error:", error)
    return NextResponse.json({ error: "Failed to like comment" }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string; commentId: string } }) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const existing = await prisma.comment.findUnique({ where: { id: params.commentId } })
    if (!existing || existing.postId !== params.id) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const currentLikedBy = Array.isArray(existing.likedBy) ? existing.likedBy : []
    const nextLikedBy = currentLikedBy.filter((id) => id !== session.sub)

    await prisma.comment.update({
      where: { id: params.commentId },
      data: { likedBy: { set: nextLikedBy } } as any,
    })

    const post = await prisma.communityPost.findUnique({
      where: { id: params.id },
      include: { author: true, comments: { include: { author: true }, orderBy: { createdAt: "desc" } } },
    })
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json({ post: await mapPost(post, session.sub) })
  } catch (error) {
    console.error("DELETE /api/community/posts/[id]/comments/[commentId]/like error:", error)
    return NextResponse.json({ error: "Failed to unlike comment" }, { status: 500 })
  }
}
