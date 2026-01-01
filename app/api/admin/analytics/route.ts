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

type DailyCountRow = { day: Date; count: bigint }
type DailySumRow = { day: Date; sum: bigint | null }

export async function GET(req: Request) {
  const session = await getSessionUser()
  if (!session || session.role !== "ADMIN") return forbidden()

  const url = new URL(req.url)
  const rangeDaysRaw = Number(url.searchParams.get("rangeDays") || 30) || 30
  const rangeDays = Math.max(7, Math.min(365, Math.floor(rangeDaysRaw)))

  const now = new Date()
  const from = startOfDay(new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000))

  const [usersByDay, eventsByDay, reportsByDay, revenueByDay] = await Promise.all([
    prisma.$queryRaw<DailyCountRow[]>`
      SELECT date_trunc('day', "createdAt") as day, COUNT(*)::bigint as count
      FROM "User"
      WHERE "createdAt" >= ${from}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    prisma.$queryRaw<DailyCountRow[]>`
      SELECT date_trunc('day', "createdAt") as day, COUNT(*)::bigint as count
      FROM "Event"
      WHERE "createdAt" >= ${from}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    prisma.$queryRaw<DailyCountRow[]>`
      SELECT date_trunc('day', "createdAt") as day, COUNT(*)::bigint as count
      FROM "EventReport"
      WHERE "createdAt" >= ${from}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    prisma.$queryRaw<DailySumRow[]>`
      SELECT date_trunc('day', "createdAt") as day, COALESCE(SUM("amount"), 0)::bigint as sum
      FROM "BoostReceipt"
      WHERE "createdAt" >= ${from}
      GROUP BY 1
      ORDER BY 1 ASC
    `,
  ])

  const mapCounts = (rows: { day: Date; count: bigint }[]) => {
    const m = new Map<string, number>()
    for (const r of rows) {
      const key = startOfDay(new Date(r.day)).toISOString().slice(0, 10)
      m.set(key, Number(r.count ?? 0))
    }
    return m
  }

  const mapSums = (rows: { day: Date; sum: bigint | null }[]) => {
    const m = new Map<string, number>()
    for (const r of rows) {
      const key = startOfDay(new Date(r.day)).toISOString().slice(0, 10)
      m.set(key, Number(r.sum ?? 0))
    }
    return m
  }

  const usersMap = mapCounts(usersByDay)
  const eventsMap = mapCounts(eventsByDay)
  const reportsMap = mapCounts(reportsByDay)
  const revenueMap = mapSums(revenueByDay)

  const series: Array<{ day: string; users: number; events: number; reports: number; revenue: number }> = []

  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = startOfDay(new Date(now.getTime() - i * 24 * 60 * 60 * 1000))
    const key = d.toISOString().slice(0, 10)
    series.push({
      day: key,
      users: usersMap.get(key) ?? 0,
      events: eventsMap.get(key) ?? 0,
      reports: reportsMap.get(key) ?? 0,
      revenue: revenueMap.get(key) ?? 0,
    })
  }

  const totals = series.reduce(
    (acc, row) => {
      acc.users += row.users
      acc.events += row.events
      acc.reports += row.reports
      acc.revenue += row.revenue
      return acc
    },
    { users: 0, events: 0, reports: 0, revenue: 0 },
  )

  return NextResponse.json({
    rangeDays,
    currency: "chf",
    totals,
    series,
  })
}
