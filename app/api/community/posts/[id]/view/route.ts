"use server"

import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const post = await prisma.communityPost.findUnique({
      where: { id: params.id },
      select: { views: true },
    })
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const alreadyViewed = post.views?.includes(session.sub)
    if (alreadyViewed) {
      return NextResponse.json({ success: true, added: false, viewCount: post.views?.length ?? 0 })
    }

    const nextViews = Array.from(new Set([...(post.views ?? []), session.sub]))

    await prisma.communityPost.update({
      where: { id: params.id },
      data: { views: { set: nextViews } },
    })

    return NextResponse.json({ success: true, added: true, viewCount: nextViews.length })
  } catch (error) {
    console.error("POST /api/community/posts/[id]/view error:", error)
    return NextResponse.json({ error: "Failed to record view" }, { status: 500 })
  }
}
