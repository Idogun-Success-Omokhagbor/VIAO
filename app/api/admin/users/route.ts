import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

const VALID_ROLES = new Set(["USER", "ORGANIZER", "ADMIN"])

type Role = "USER" | "ORGANIZER" | "ADMIN"

export async function GET(req: Request) {
  const session = await getSessionUser()
  if (!session || session.role !== "ADMIN") return forbidden()

  const url = new URL(req.url)
  const q = (url.searchParams.get("q") || "").trim()
  const role = (url.searchParams.get("role") || "").toUpperCase()

  const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1)
  const pageSizeRaw = Number(url.searchParams.get("pageSize") || 50) || 50
  const pageSize = Math.max(1, Math.min(200, pageSizeRaw))

  const where: any = {}

  if (role && VALID_ROLES.has(role)) {
    where.role = role
  }

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ]
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        lastSeenAt: true,
      },
    }),
  ])

  return NextResponse.json({
    page,
    pageSize,
    total,
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
      lastSeenAt: u.lastSeenAt ? u.lastSeenAt.toISOString() : null,
    })),
  })
}

export async function PATCH(req: Request) {
  const session = await getSessionUser()
  if (!session || session.role !== "ADMIN") return forbidden()

  const body = (await req.json().catch(() => null)) as any
  const userId = typeof body?.userId === "string" ? body.userId : ""
  const nextRole = typeof body?.role === "string" ? body.role.toUpperCase() : ""

  if (!userId) return badRequest("Missing userId")
  if (!VALID_ROLES.has(nextRole)) return badRequest("Invalid role")

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, email: true } })
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (nextRole === "ADMIN" && target.role !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } })
    if (adminCount >= 1) {
      return badRequest("Single-admin mode: cannot create additional admins")
    }
  }

  // Prevent removing the last remaining admin.
  if (target.role === "ADMIN" && nextRole !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } })
    if (adminCount <= 1) {
      return badRequest("Cannot remove the last admin")
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { role: nextRole as Role }, select: { id: true } })

    await tx.adminAuditLog.create({
      data: {
        adminId: session.sub,
        adminEmail: session.email,
        action: "USER_ROLE_UPDATED",
        entityType: "USER",
        entityId: userId,
        before: { role: target.role },
        after: { role: nextRole },
      },
      select: { id: true },
    })
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const session = await getSessionUser()
  if (!session || session.role !== "ADMIN") return forbidden()

  const body = (await req.json().catch(() => null)) as any
  const userId = typeof body?.userId === "string" ? body.userId : ""
  if (!userId) return badRequest("Missing userId")

  if (userId === session.sub) {
    return badRequest("Cannot delete your own account")
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, email: true, name: true } })
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (target.role === "ADMIN") {
    return badRequest("Cannot delete an admin user")
  }

  await prisma.$transaction(async (tx) => {
    await tx.conversation.updateMany({ where: { requestedBy: userId }, data: { requestedBy: null } })

    await tx.conversationParticipant.deleteMany({ where: { userId } })
    await tx.message.deleteMany({ where: { senderId: userId } })

    const posts = await tx.communityPost.findMany({ where: { authorId: userId }, select: { id: true } })
    const postIds = posts.map((p) => p.id)
    if (postIds.length) {
      await tx.comment.deleteMany({ where: { postId: { in: postIds } } })
      await tx.communityPost.deleteMany({ where: { id: { in: postIds } } })
    }

    await tx.comment.deleteMany({ where: { authorId: userId } })
    await tx.notification.deleteMany({ where: { userId } })
    await tx.passwordResetToken.deleteMany({ where: { userId } })

    const events = await tx.event.findMany({ where: { organizerId: userId }, select: { id: true } })
    const eventIds = events.map((e) => e.id)
    if (eventIds.length) {
      await tx.rsvp.deleteMany({ where: { eventId: { in: eventIds } } })
      await tx.event.deleteMany({ where: { id: { in: eventIds } } })
    }

    await tx.rsvp.deleteMany({ where: { userId } })

    await tx.adminAuditLog.create({
      data: {
        adminId: session.sub,
        adminEmail: session.email,
        action: "USER_DELETED",
        entityType: "USER",
        entityId: userId,
        before: { id: target.id, email: target.email, role: target.role, name: target.name },
        after: { deleted: true },
      },
      select: { id: true },
    })

    await tx.user.delete({ where: { id: userId }, select: { id: true } })
  })

  return NextResponse.json({ ok: true })
}
