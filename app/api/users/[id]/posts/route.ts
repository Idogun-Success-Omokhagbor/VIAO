import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { mapPost } from "../../../community/posts/route"

const DEFAULT_TAKE = 5
const MAX_TAKE = 20

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const userId = params.id
  if (!userId) return NextResponse.json({ error: "Missing user id" }, { status: 400 })

  const url = new URL(req.url)
  const pageRaw = url.searchParams.get("page")
  const takeRaw = url.searchParams.get("take")

  const page = Math.max(0, Number.parseInt(pageRaw ?? "0", 10) || 0)
  const take = Math.min(MAX_TAKE, Math.max(1, Number.parseInt(takeRaw ?? String(DEFAULT_TAKE), 10) || DEFAULT_TAKE))
  const skip = page * take

  const session = await getSessionUser()

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, preferences: true },
    })

    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const viewerId = session?.sub ?? null
    const isOwner = viewerId === userId

    const prefs = (user.preferences ?? {}) as Record<string, unknown>
    const isProfilePublic = (prefs.profileVisibility as boolean | undefined) ?? true

    if (!isOwner && !isProfilePublic) {
      return NextResponse.json({ error: "Profile is private" }, { status: 403 })
    }

    const [total, posts] = await Promise.all([
      prisma.communityPost.count({ where: { authorId: userId } }),
      prisma.communityPost.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          author: true,
          comments: {
            include: { author: true },
            orderBy: { createdAt: "desc" },
          },
        },
      }),
    ])

    const mapped = await Promise.all(posts.map((p) => mapPost(p, session?.sub)))

    return NextResponse.json({
      page,
      take,
      total,
      hasMore: skip + posts.length < total,
      posts: mapped,
    })
  } catch (error) {
    console.error("GET /api/users/[id]/posts error:", error)
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 })
  }
}
