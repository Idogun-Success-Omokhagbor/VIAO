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

type OverviewReceipt = {
  id: string
  createdAt: Date
  level: number
  amount: number
  currency: string
  eventTitle: string
  eventId: string
  organizerId: string
}

export async function GET(req: Request) {
  const session = await getSessionUser()
  if (!session || session.role !== "ADMIN") return forbidden()

  const boostReceiptClient = (prisma as any).boostReceipt
  if (!boostReceiptClient?.findMany || !boostReceiptClient?.aggregate) {
    return NextResponse.json(
      { error: "Admin billing metrics are not available on this server yet. Restart the dev server (and run prisma generate if needed)." },
      { status: 500 },
    )
  }

  const url = new URL(req.url)
  const rangeDaysRaw = Number(url.searchParams.get("rangeDays") || 30) || 30
  const rangeDays = Math.max(1, Math.min(365, Math.floor(rangeDaysRaw)))

  const now = new Date()
  const from = startOfDay(new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000))

  const totalUsers = await prisma.user.count()
  const totalOrganizers = await prisma.user.count({ where: { role: "ORGANIZER" } })
  const totalEvents = await prisma.event.count()
  const publishedEvents = await prisma.event.count({ where: { status: "PUBLISHED", isCancelled: false } })
  const openReports = await prisma.eventReport.count({ where: { status: "OPEN" } })

  const revenueAllTime = (await boostReceiptClient.aggregate({ _sum: { amount: true } })) as { _sum: { amount: number | null } }
  const revenueRange = (await boostReceiptClient.aggregate({ where: { createdAt: { gte: from } }, _sum: { amount: true } })) as {
    _sum: { amount: number | null }
  }

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  const recentEvents = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, title: true, status: true, isCancelled: true, createdAt: true, organizerId: true },
  })

  const recentReports = await prisma.eventReport.findMany({
    where: { createdAt: { gte: from } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, reason: true, status: true, createdAt: true, eventId: true, reporterId: true },
  })

  const recentReceipts = (await boostReceiptClient.findMany({
    where: { createdAt: { gte: from } },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      createdAt: true,
      level: true,
      amount: true,
      currency: true,
      eventTitle: true,
      eventId: true,
      organizerId: true,
    },
  })) as OverviewReceipt[]

  const organizerIds = Array.from(new Set(recentReceipts.map((r: OverviewReceipt) => r.organizerId))).filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  )
  const organizers = organizerIds.length
    ? await prisma.user.findMany({ where: { id: { in: organizerIds } }, select: { id: true, name: true, email: true } })
    : []

  const organizerById = new Map(organizers.map((o) => [o.id, o]))

  return NextResponse.json({
    rangeDays,
    totals: {
      users: totalUsers,
      organizers: totalOrganizers,
      events: totalEvents,
      publishedEvents,
      openReports,
      boostRevenueAllTime: Number(revenueAllTime._sum.amount ?? 0),
      boostRevenueRange: Number(revenueRange._sum.amount ?? 0),
      currency: "chf",
    },
    recent: {
      users: recentUsers.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
      events: recentEvents.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
      reports: recentReports.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      receipts: recentReceipts.map((r) => {
        const org = organizerById.get(r.organizerId)
        return {
          ...r,
          createdAt: r.createdAt.toISOString(),
          organizer: org ? { id: org.id, name: org.name, email: org.email } : null,
        }
      }),
    },
  })
}
