import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

const ONLINE_WINDOW_MS = 2 * 60 * 1000

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const userId = params.id
  if (!userId) return NextResponse.json({ error: "Missing user id" }, { status: 400 })

  try {
    const session = await getSessionUser()
    const viewerId = session?.sub ?? null
    const isOwner = viewerId === userId

    const viewer = viewerId
      ? await prisma.user.findUnique({
          where: { id: viewerId },
          select: { id: true, preferences: true },
        })
      : null

    const viewerPrefs = ((viewer as any)?.preferences ?? {}) as Record<string, unknown>
    const viewerAllowsPresence = (viewerPrefs.showOnlineStatus as boolean | undefined) ?? true

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        avatarUrl: true,
        location: true,
        bio: true,
        interests: true,
        createdAt: true,
        lastSeenAt: true,
        preferences: true,
      },
    })

    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const prefs = ((user as any).preferences ?? {}) as Record<string, unknown>
    const isProfilePublic = (prefs.profileVisibility as boolean | undefined) ?? true
    const showOnlineStatus = (prefs.showOnlineStatus as boolean | undefined) ?? true

    const canViewFullProfile = isOwner || isProfilePublic

    const canViewPresence = isOwner || (viewerAllowsPresence && showOnlineStatus)

    const isOnline = (() => {
      if (!canViewPresence) return false
      if (!user.lastSeenAt) return false
      const lastSeenMs = new Date(user.lastSeenAt).getTime()
      if (!Number.isFinite(lastSeenMs)) return false
      const diff = Date.now() - lastSeenMs
      if (diff < 0) return false
      return diff < ONLINE_WINDOW_MS
    })()

    const isCollaborator = user.role !== "USER"

    if (!canViewFullProfile) {
      return NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl ?? null,
          isOnline,
          isCollaborator,
        },
        isProfilePublic,
        canViewFullProfile,
      })
    }

    const [postsCount, commentsCount, eventsCount] = await Promise.all([
      prisma.communityPost.count({ where: { authorId: userId } }),
      prisma.comment.count({ where: { authorId: userId } }),
      prisma.event.count({ where: { organizerId: userId } }),
    ])

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
        location: user.location ?? null,
        bio: user.bio ?? null,
        interests: (user as any).interests ?? [],
        createdAt: user.createdAt.toISOString(),
        lastSeenAt: canViewPresence && user.lastSeenAt ? user.lastSeenAt.toISOString() : null,
        isOnline,
        isCollaborator,
      },
      stats: {
        posts: postsCount,
        comments: commentsCount,
        events: eventsCount,
      },
      isProfilePublic,
      canViewFullProfile,
    })
  } catch (error) {
    console.error("GET /api/users/[id]/public-profile error:", error)
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 })
  }
}
