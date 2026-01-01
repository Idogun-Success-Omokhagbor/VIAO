"use server"

import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { mapPost } from "@/lib/community-post"

const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string().min(1)).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  mediaType: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
})

export async function GET() {
  try {
    const session = await getSessionUser()
    const user = session
      ? await prisma.user.findUnique({
          where: { id: session.sub },
          select: { id: true, location: true },
        })
      : null

    const posts = await prisma.communityPost.findMany({
      where:
        user?.location && user.location.trim().length > 0
          ? {
              OR: [
                { location: { equals: user.location, mode: "insensitive" } },
                { author: { location: { equals: user.location, mode: "insensitive" } } },
                { location: null },
                { location: "" },
                { author: { location: null } },
                { author: { location: "" } },
              ],
            }
          : undefined,
      select: {
        id: true,
        title: true,
        content: true,
        tags: true,
        location: true,
        mediaType: true,
        category: true,
        likedBy: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            location: true,
          },
        },
        comments: {
          select: {
            id: true,
            content: true,
            likedBy: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
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
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, location: true },
    })

    const created = await prisma.communityPost.create({
      data: {
        title: data.title,
        content: data.content,
        tags: data.tags ?? [],
        imageUrl: data.imageUrl || undefined,
        mediaType: data.mediaType ?? undefined,
        type: (data.type as any) ?? "GENERAL",
        category: data.category ?? undefined,
        location: user?.location ?? undefined,
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
