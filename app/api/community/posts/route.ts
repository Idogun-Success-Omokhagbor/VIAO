"use server"

import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  type: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
})

export async function mapPost(post: any, sessionUserId?: string) {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    tags: post.tags ?? [],
    images: post.imageUrl ? [post.imageUrl] : [],
    likes: post.likedBy?.length ?? 0,
    likedBy: post.likedBy ?? [],
    isLiked: sessionUserId ? post.likedBy?.includes(sessionUserId) ?? false : false,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    author: {
      id: post.author.id,
      name: post.author.name,
      email: post.author.email,
      avatar: post.author.avatarUrl ?? undefined,
    },
    comments:
      post.comments?.map((comment: any) => ({
        id: comment.id,
        content: comment.content,
        likes: comment.likedBy?.length ?? 0,
        likedBy: comment.likedBy ?? [],
        isLiked: sessionUserId ? comment.likedBy?.includes(sessionUserId) ?? false : false,
        createdAt: comment.createdAt.toISOString(),
        author: {
          id: comment.author.id,
          name: comment.author.name,
          email: comment.author.email,
          avatar: comment.author.avatarUrl ?? undefined,
        },
      })) ?? [],
  }
}

export async function GET() {
  try {
    const session = await getSessionUser()
    const posts = await prisma.communityPost.findMany({
      include: {
        author: true,
        comments: {
          include: { author: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const mapped = await Promise.all(posts.map((p) => mapPost(p, session?.sub)))
    return NextResponse.json({ posts: mapped })
  } catch (error) {
    console.error("GET /api/community/posts error:", error)
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const json = await req.json()
    const parsed = createPostSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid post data" }, { status: 400 })
    }

    const data = parsed.data

    const created = await prisma.communityPost.create({
      data: {
        title: data.title,
        content: data.content,
        tags: data.tags ?? [],
        imageUrl: data.imageUrl || undefined,
        type: (data.type as any) ?? "GENERAL",
        authorId: session.sub,
      },
      include: {
        author: true,
        comments: { include: { author: true } },
      },
    })

    return NextResponse.json({ post: await mapPost(created, session.sub) }, { status: 201 })
  } catch (error) {
    console.error("POST /api/community/posts error:", error)
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 })
  }
}
