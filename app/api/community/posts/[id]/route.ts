"use server"

import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { mapPost } from "../route"

const updatePostSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
})

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser()
  try {
    const post = await prisma.communityPost.findUnique({
      where: { id: params.id },
      include: { author: true, comments: { include: { author: true }, orderBy: { createdAt: "desc" } } },
    })
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ post: await mapPost(post, session?.sub) })
  } catch (error) {
    console.error("GET /api/community/posts/[id] error:", error)
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const json = await req.json()
  const parsed = updatePostSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 })

  try {
    const existing = await prisma.communityPost.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (existing.authorId !== session.sub) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const updated = await prisma.communityPost.update({
      where: { id: params.id },
      data: {
        title: parsed.data.title ?? undefined,
        content: parsed.data.content ?? undefined,
        tags: parsed.data.tags ?? undefined,
        imageUrl: parsed.data.imageUrl === "" ? null : parsed.data.imageUrl ?? undefined,
      },
      include: { author: true, comments: { include: { author: true }, orderBy: { createdAt: "desc" } } },
    })
    return NextResponse.json({ post: await mapPost(updated, session.sub) })
  } catch (error) {
    console.error("PATCH /api/community/posts/[id] error:", error)
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const existing = await prisma.communityPost.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (existing.authorId !== session.sub) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    await prisma.communityPost.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/community/posts/[id] error:", error)
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 })
  }
}
