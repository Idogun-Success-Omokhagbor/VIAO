import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const postId = params.id
  if (!postId) return NextResponse.json({ error: "Missing post id" }, { status: 400 })

  try {
    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      select: { imageUrl: true, mediaType: true },
    })

    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (!post.imageUrl || !post.mediaType) {
      return NextResponse.json({ error: "No media" }, { status: 404 })
    }

    return NextResponse.json({ mediaUrl: post.imageUrl, mediaType: post.mediaType })
  } catch (error) {
    console.error("GET /api/community/posts/[id]/media error:", error)
    return NextResponse.json({ error: "Failed to fetch media" }, { status: 500 })
  }
}
