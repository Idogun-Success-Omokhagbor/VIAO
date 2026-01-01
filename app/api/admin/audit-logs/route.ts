import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

type AuditLogRow = {
  id: string
  createdAt: Date
  adminId: string
  adminEmail: string
  action: string
  entityType: string
  entityId: string
  before: any
  after: any
  metadata: any
}

export async function GET(req: Request) {
  const session = await getSessionUser()
  if (!session || session.role !== "ADMIN") return forbidden()

  const url = new URL(req.url)
  const q = (url.searchParams.get("q") || "").trim().toLowerCase()
  const action = (url.searchParams.get("action") || "").trim()
  const entityType = (url.searchParams.get("entityType") || "").trim()

  const fromRaw = url.searchParams.get("from")
  const toRaw = url.searchParams.get("to")

  const createdAt: { gte?: Date; lte?: Date } = {}

  if (fromRaw) {
    const from = new Date(fromRaw)
    if (!Number.isNaN(from.getTime())) createdAt.gte = startOfDay(from)
  }

  if (toRaw) {
    const to = new Date(toRaw)
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999)
      createdAt.lte = to
    }
  }

  const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1)
  const pageSizeRaw = Number(url.searchParams.get("pageSize") || 50) || 50
  const pageSize = Math.max(1, Math.min(200, Math.floor(pageSizeRaw)))

  const where: any = {}

  if (createdAt.gte || createdAt.lte) where.createdAt = createdAt

  if (action) where.action = { contains: action, mode: "insensitive" }
  if (entityType) where.entityType = { contains: entityType, mode: "insensitive" }

  if (q) {
    where.OR = [
      { adminEmail: { contains: q, mode: "insensitive" } },
      { action: { contains: q, mode: "insensitive" } },
      { entityType: { contains: q, mode: "insensitive" } },
      { entityId: { contains: q, mode: "insensitive" } },
    ]
  }

  const [total, rows] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        createdAt: true,
        adminId: true,
        adminEmail: true,
        action: true,
        entityType: true,
        entityId: true,
        before: true,
        after: true,
        metadata: true,
      },
    }),
  ])

  const logs = (Array.isArray(rows) ? rows : []) as AuditLogRow[]

  return NextResponse.json({
    page,
    pageSize,
    total,
    logs: logs.map((l) => ({
      id: l.id,
      createdAt: l.createdAt.toISOString(),
      adminId: l.adminId,
      adminEmail: l.adminEmail,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      before: l.before ?? null,
      after: l.after ?? null,
      metadata: l.metadata ?? null,
    })),
  })
}
