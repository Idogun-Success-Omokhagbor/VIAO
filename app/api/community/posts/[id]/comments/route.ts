"use server"

import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { communityPostClientSelect, mapPost } from "@/lib/community-post"
import { createNotification } from "@/lib/notifications"

const createCommentSchema = z.object({
  content: z.string().min(1),
})

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const json = await req.json()
    const parsed = createCommentSchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: "Invalid comment" }, { status: 400 })

    await prisma.comment.create({
      data: {
        content: parsed.data.content,
        postId: params.id,
        authorId: session.sub,
      },
    })

    const post = await prisma.communityPost.findUnique({
      where: { id: params.id },
      select: communityPostClientSelect,
    })
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })

    if (post.author.id !== session.sub) {
      const actor = await prisma.user.findUnique({ where: { id: session.sub }, select: { name: true } })
      await createNotification({
        userId: post.author.id,
        type: "COMMENT",
        title: `${actor?.name || "Someone"} commented on your post`,
        body: parsed.data.content.slice(0, 120),
        data: { postId: params.id, actorId: session.sub, url: "/community" },
        channel: "PUSH",
      })
    }

    return NextResponse.json({ post: await mapPost(post, session.sub) })
  } catch (error) {
    console.error("POST /api/community/posts/[id]/comments error:", error)
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 })
  }
}
