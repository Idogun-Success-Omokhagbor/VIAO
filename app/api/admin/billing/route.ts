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

type ReceiptRow = {
  id: string
  createdAt: Date
  level: number
  amount: number
  currency: string
  boostUntil: Date | null
  eventTitle: string
  eventId: string
  organizerId: string
}

export async function GET(req: Request) {
  const session = await getSessionUser()
  if (!session || session.role !== "ADMIN") return forbidden()

  const boostReceiptClient = (prisma as any).boostReceipt
  if (!boostReceiptClient?.findMany || !boostReceiptClient?.count || !boostReceiptClient?.aggregate) {
    return NextResponse.json(
      { error: "Receipts are not available on this server yet. Restart the dev server (and run prisma generate if needed)." },
      { status: 500 },
    )
  }

  const url = new URL(req.url)
  const q = (url.searchParams.get("q") || "").trim().toLowerCase()

  const fromRaw = url.searchParams.get("from")
  const toRaw = url.searchParams.get("to")

  const createdAt: { gte?: Date; lte?: Date } = {}

  if (fromRaw) {
    const from = new Date(fromRaw)
    if (!Number.isNaN(from.getTime())) {
      createdAt.gte = startOfDay(from)
    }
  }

  if (toRaw) {
    const to = new Date(toRaw)
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999)
      createdAt.lte = to
    }
  }

  const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1)
  const pageSizeRaw = Number(url.searchParams.get("pageSize") || 25) || 25
  const pageSize = Math.max(1, Math.min(100, Math.floor(pageSizeRaw)))

  const where: any = {}

  if (createdAt.gte || createdAt.lte) {
    where.createdAt = createdAt
  }

  if (q) {
    where.OR = [{ eventTitle: { contains: q, mode: "insensitive" } }]
  }

  const [total, rows, totalsAllTime, totalsRange] = await Promise.all([
    boostReceiptClient.count({ where }),
    boostReceiptClient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        createdAt: true,
        level: true,
        amount: true,
        currency: true,
        boostUntil: true,
        eventTitle: true,
        eventId: true,
        organizerId: true,
      },
    }),
    boostReceiptClient.aggregate({ _sum: { amount: true }, _count: { id: true } }),
    boostReceiptClient.aggregate({ where: createdAt.gte || createdAt.lte ? { createdAt } : undefined, _sum: { amount: true }, _count: { id: true } }),
  ])

  const receipts = (Array.isArray(rows) ? rows : []) as ReceiptRow[]

  const organizerIds = Array.from(new Set(receipts.map((r) => r.organizerId))).filter((id) => typeof id === "string" && id.length > 0)
  const organizers = organizerIds.length
    ? await prisma.user.findMany({ where: { id: { in: organizerIds } }, select: { id: true, name: true, email: true } })
    : []

  const organizerById = new Map(organizers.map((o) => [o.id, o]))

  return NextResponse.json({
    page,
    pageSize,
    total,
    currency: "chf",
    totals: {
      allTime: {
        amount: Number(totalsAllTime?._sum?.amount ?? 0),
        count: Number(totalsAllTime?._count?.id ?? 0),
      },
      range: {
        amount: Number(totalsRange?._sum?.amount ?? 0),
        count: Number(totalsRange?._count?.id ?? 0),
      },
    },
    receipts: receipts.map((r) => {
      const org = organizerById.get(r.organizerId)
      return {
        ...r,
        createdAt: r.createdAt.toISOString(),
        boostUntil: r.boostUntil ? r.boostUntil.toISOString() : null,
        organizer: org ? { id: org.id, name: org.name, email: org.email } : null,
      }
    }),
  })
}
