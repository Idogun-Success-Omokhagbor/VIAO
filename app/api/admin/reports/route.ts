import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

type AdminReportRow = {
  id: string
  reason: string
  details: string | null
  status: "OPEN" | "REVIEWED" | "DISMISSED"
  createdAt: Date
  reporterId: string
  reporter: { id: string; name: string; email: string }
  eventId: string
  event: {
    id: string
    title: string
    isCancelled: boolean
    cancelledAt: Date | null
    organizerId: string
    organizer: { id: string; name: string; email: string }
  }
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export async function GET(req: Request) {
  const session = await getSessionUser()
  if (!session || session.role !== "ADMIN") return forbidden()

  const url = new URL(req.url)
  const q = (url.searchParams.get("q") || "").trim()
  const statusRaw = (url.searchParams.get("status") || "ALL").toUpperCase()
  const eventId = (url.searchParams.get("eventId") || "").trim()

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
  const pageSizeRaw = Number(url.searchParams.get("pageSize") || 25) || 25
  const pageSize = Math.max(1, Math.min(200, Math.floor(pageSizeRaw)))

  const where: any = {}

  if (statusRaw === "OPEN" || statusRaw === "REVIEWED" || statusRaw === "DISMISSED") {
    where.status = statusRaw
  }

  if (eventId) {
    where.eventId = eventId
  }

  if (createdAt.gte || createdAt.lte) {
    where.createdAt = createdAt
  }

  if (q) {
    where.OR = [
      { reason: { contains: q, mode: "insensitive" } },
      { details: { contains: q, mode: "insensitive" } },
      { event: { is: { title: { contains: q, mode: "insensitive" } } } },
    ]
  }

  const [total, rows] = await Promise.all([
    prisma.eventReport.count({ where }),
    prisma.eventReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        reason: true,
        details: true,
        status: true,
        createdAt: true,
        reporterId: true,
        reporter: { select: { id: true, name: true, email: true } },
        eventId: true,
        event: {
          select: {
            id: true,
            title: true,
            isCancelled: true,
            cancelledAt: true,
            organizerId: true,
            organizer: { select: { id: true, name: true, email: true } },
          },
        },
      },
    }),
  ])

  const reports = (Array.isArray(rows) ? rows : []) as AdminReportRow[]

  return NextResponse.json({
    page,
    pageSize,
    total,
    reports: reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      reporterId: r.reporterId,
      reporter: r.reporter,
      eventId: r.eventId,
      event: {
        ...r.event,
        cancelledAt: r.event.cancelledAt ? r.event.cancelledAt.toISOString() : null,
      },
    })),
  })
}

type PatchAction = "SET_STATUS" | "CANCEL_EVENT"

type ReportStatus = "OPEN" | "REVIEWED" | "DISMISSED"

export async function PATCH(req: Request) {
  const session = await getSessionUser()
  if (!session || session.role !== "ADMIN") return forbidden()

  const body = (await req.json().catch(() => null)) as any
  const reportId = typeof body?.reportId === "string" ? body.reportId : ""
  const action = typeof body?.action === "string" ? (body.action.toUpperCase() as PatchAction) : ("" as PatchAction)

  if (!reportId) return badRequest("Missing reportId")
  if (action !== "SET_STATUS" && action !== "CANCEL_EVENT") return badRequest("Invalid action")

  const report = await prisma.eventReport.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      status: true,
      reason: true,
      details: true,
      createdAt: true,
      eventId: true,
      reporterId: true,
      event: { select: { id: true, title: true, isCancelled: true, cancelledAt: true, status: true } },
    },
  })

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 })
  }

  if (action === "SET_STATUS") {
    const nextStatus = typeof body?.status === "string" ? (body.status.toUpperCase() as ReportStatus) : ("" as ReportStatus)
    if (nextStatus !== "OPEN" && nextStatus !== "REVIEWED" && nextStatus !== "DISMISSED") return badRequest("Invalid status")

    await prisma.$transaction(async (tx) => {
      await tx.eventReport.update({ where: { id: reportId }, data: { status: nextStatus }, select: { id: true } })

      await tx.adminAuditLog.create({
        data: {
          adminId: session.sub,
          adminEmail: session.email,
          action: "REPORT_STATUS_UPDATED",
          entityType: "EVENT_REPORT",
          entityId: reportId,
          before: { status: report.status, reason: report.reason, details: report.details, eventId: report.eventId, reporterId: report.reporterId },
          after: { status: nextStatus },
        },
        select: { id: true },
      })
    })

    return NextResponse.json({ ok: true })
  }

  await prisma.$transaction(async (tx) => {
    const eventNext = { isCancelled: true, cancelledAt: new Date() }

    await tx.event.update({ where: { id: report.eventId }, data: eventNext, select: { id: true } })
    await tx.eventReport.update({ where: { id: reportId }, data: { status: "REVIEWED" }, select: { id: true } })

    await tx.adminAuditLog.create({
      data: {
        adminId: session.sub,
        adminEmail: session.email,
        action: "EVENT_CANCELLED_FROM_REPORT",
        entityType: "EVENT",
        entityId: report.eventId,
        before: { isCancelled: report.event.isCancelled, cancelledAt: report.event.cancelledAt, status: report.event.status, title: report.event.title },
        after: { isCancelled: true, cancelledAt: eventNext.cancelledAt, reportId },
        metadata: { reportId },
      },
      select: { id: true },
    })

    await tx.adminAuditLog.create({
      data: {
        adminId: session.sub,
        adminEmail: session.email,
        action: "REPORT_STATUS_UPDATED",
        entityType: "EVENT_REPORT",
        entityId: reportId,
        before: { status: report.status, reason: report.reason, details: report.details, eventId: report.eventId, reporterId: report.reporterId },
        after: { status: "REVIEWED" },
        metadata: { reportId, eventId: report.eventId },
      },
      select: { id: true },
    })
  })

  return NextResponse.json({ ok: true })
}
