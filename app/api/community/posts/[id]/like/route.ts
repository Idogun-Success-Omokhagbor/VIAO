"use server"

import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { mapPost } from "../../route"

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const existing = (await prisma.communityPost.findUnique({ where: { id: params.id } })) as any
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const nextLikedBy: string[] = Array.isArray(existing.likedBy)
      ? existing.likedBy.includes(session.sub)
        ? existing.likedBy
        : [...existing.likedBy, session.sub]
      : [session.sub]
    const post = (await prisma.communityPost.update({
      where: { id: params.id },
      data: {
        likedBy: { set: nextLikedBy },
      } as any,
      include: { author: true, comments: { include: { author: true } } },
    })) as any
    return NextResponse.json({ post: await mapPost(post, session.sub) })
  } catch (error) {
    console.error("POST /api/community/posts/[id]/like error:", error)
    return NextResponse.json({ error: "Failed to like post" }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const existing = (await prisma.communityPost.findUnique({ where: { id: params.id } })) as any
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const nextLikedBy: string[] = Array.isArray(existing.likedBy) ? existing.likedBy.filter((u: string) => u !== session.sub) : []
    const post = (await prisma.communityPost.update({
      where: { id: params.id },
      data: {
        likedBy: { set: nextLikedBy },
      } as any,
      include: { author: true, comments: { include: { author: true } } },
    })) as any
    return NextResponse.json({ post: await mapPost(post, session.sub) })
  } catch (error) {
    console.error("DELETE /api/community/posts/[id]/like error:", error)
    return NextResponse.json({ error: "Failed to unlike post" }, { status: 500 })
  }
}
