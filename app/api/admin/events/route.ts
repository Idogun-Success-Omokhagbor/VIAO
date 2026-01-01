import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

type AdminEventRow = {
  id: string
  title: string
  status: "DRAFT" | "PUBLISHED"
  isCancelled: boolean
  cancelledAt: Date | null
  city: string | null
  category: string
  createdAt: Date
  organizerId: string
  organizer: { id: string; name: string; email: string }
  isBoosted: boolean
  boostLevel: number
  boostUntil: Date | null
  _count: {
    rsvps: number
    saves: number
    reports: number
  }
}

export async function GET(req: Request) {
  const session = await getSessionUser()
  if (!session || session.role !== "ADMIN") return forbidden()

  const url = new URL(req.url)
  const q = (url.searchParams.get("q") || "").trim()
  const statusRaw = (url.searchParams.get("status") || "").toUpperCase()
  const cancelledRaw = (url.searchParams.get("cancelled") || "ALL").toUpperCase()
  const boostedRaw = (url.searchParams.get("boosted") || "ALL").toUpperCase()
  const city = (url.searchParams.get("city") || "").trim()
  const category = (url.searchParams.get("category") || "").trim()

  const openReportsOnly = url.searchParams.get("openReportsOnly") === "1" || url.searchParams.get("openReportsOnly") === "true"

  const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1)
  const pageSizeRaw = Number(url.searchParams.get("pageSize") || 25) || 25
  const pageSize = Math.max(1, Math.min(200, Math.floor(pageSizeRaw)))

  const where: any = {}

  if (q) {
    where.OR = [{ title: { contains: q, mode: "insensitive" } }]
  }

  if (statusRaw === "DRAFT" || statusRaw === "PUBLISHED") {
    where.status = statusRaw
  }

  if (cancelledRaw === "YES") where.isCancelled = true
  if (cancelledRaw === "NO") where.isCancelled = false

  if (boostedRaw === "YES") where.isBoosted = true
  if (boostedRaw === "NO") where.isBoosted = false

  if (city) {
    where.city = { contains: city, mode: "insensitive" }
  }

  if (category) {
    where.category = { contains: category, mode: "insensitive" }
  }

  if (openReportsOnly) {
    where.reports = { some: { status: "OPEN" } }
  }

  const [total, rows] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        status: true,
        isCancelled: true,
        cancelledAt: true,
        city: true,
        category: true,
        createdAt: true,
        organizerId: true,
        organizer: { select: { id: true, name: true, email: true } },
        isBoosted: true,
        boostLevel: true,
        boostUntil: true,
        _count: { select: { rsvps: true, saves: true, reports: true } },
      },
    }),
  ])

  const events = (Array.isArray(rows) ? rows : []) as AdminEventRow[]
  const eventIds = events.map((e) => e.id)

  const openReportCounts = eventIds.length
    ? await prisma.eventReport.groupBy({
        by: ["eventId"],
        where: { status: "OPEN", eventId: { in: eventIds } },
        _count: { _all: true },
      })
    : []

  const openReportsByEventId = new Map(openReportCounts.map((r) => [r.eventId, Number((r as any)._count?._all ?? 0)]))

  return NextResponse.json({
    page,
    pageSize,
    total,
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      status: e.status,
      isCancelled: e.isCancelled,
      cancelledAt: e.cancelledAt ? e.cancelledAt.toISOString() : null,
      city: e.city,
      category: e.category,
      createdAt: e.createdAt.toISOString(),
      organizerId: e.organizerId,
      organizer: e.organizer,
      isBoosted: e.isBoosted,
      boostLevel: e.boostLevel,
      boostUntil: e.boostUntil ? e.boostUntil.toISOString() : null,
      counts: {
        rsvps: Number(e._count?.rsvps ?? 0),
        saves: Number(e._count?.saves ?? 0),
        reports: Number(e._count?.reports ?? 0),
        openReports: Number(openReportsByEventId.get(e.id) ?? 0),
      },
    })),
  })
}

type PatchAction = "CANCEL" | "UNCANCEL"

export async function PATCH(req: Request) {
  const session = await getSessionUser()
  if (!session || session.role !== "ADMIN") return forbidden()

  const body = (await req.json().catch(() => null)) as any
  const eventId = typeof body?.eventId === "string" ? body.eventId : ""
  const action = typeof body?.action === "string" ? (body.action.toUpperCase() as PatchAction) : ("" as PatchAction)

  if (!eventId) return badRequest("Missing eventId")
  if (action !== "CANCEL" && action !== "UNCANCEL") return badRequest("Invalid action")

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, isCancelled: true, cancelledAt: true, status: true, title: true } })
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 })
  }

  const next =
    action === "CANCEL"
      ? { isCancelled: true, cancelledAt: new Date() }
      : { isCancelled: false, cancelledAt: null as Date | null }

  await prisma.$transaction(async (tx) => {
    await tx.event.update({ where: { id: eventId }, data: next, select: { id: true } })

    await tx.adminAuditLog.create({
      data: {
        adminId: session.sub,
        adminEmail: session.email,
        action: action === "CANCEL" ? "EVENT_CANCELLED" : "EVENT_UNCANCELLED",
        entityType: "EVENT",
        entityId: eventId,
        before: { isCancelled: event.isCancelled, cancelledAt: event.cancelledAt, status: event.status, title: event.title },
        after: { isCancelled: next.isCancelled, cancelledAt: next.cancelledAt },
      },
      select: { id: true },
    })
  })

  return NextResponse.json({ ok: true })
}
