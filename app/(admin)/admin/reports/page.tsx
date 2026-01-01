"use client"

import { useEffect, useMemo, useState } from "react"
import { RefreshCcw, Search } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ConfirmDialog } from "@/components/confirm-dialog"

type ReportStatus = "OPEN" | "REVIEWED" | "DISMISSED"

type AdminReport = {
  id: string
  reason: string
  details: string | null
  status: ReportStatus
  createdAt: string
  reporterId: string
  reporter: { id: string; name: string; email: string }
  eventId: string
  event: {
    id: string
    title: string
    isCancelled: boolean
    cancelledAt: string | null
    organizerId: string
    organizer: { id: string; name: string; email: string }
  }
}

type ReportsResponse = {
  page: number
  pageSize: number
  total: number
  reports: AdminReport[]
}

type PendingAction =
  | { type: "SET_STATUS"; reportId: string; nextStatus: ReportStatus; title: string }
  | { type: "CANCEL_EVENT"; reportId: string; eventId: string; title: string }
  | null

export default function AdminReportsPage() {
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<ReportStatus | "ALL">("OPEN")
  const [eventId, setEventId] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const [page, setPage] = useState(1)
  const [data, setData] = useState<ReportsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [confirm, setConfirm] = useState<PendingAction>(null)
  const [saving, setSaving] = useState(false)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (q.trim()) params.set("q", q.trim())
    if (status !== "ALL") params.set("status", status)
    if (eventId.trim()) params.set("eventId", eventId.trim())
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    params.set("page", String(page))
    params.set("pageSize", "25")
    return params.toString()
  }, [eventId, from, page, q, status, to])

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/reports?${query}`, { credentials: "include", cache: "no-store" })
      const json = (await res.json().catch(() => null)) as any
      if (!res.ok) throw new Error(json?.error || "Failed to load reports")
      setData(json as ReportsResponse)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reports")
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [query])

  const canPrev = page > 1
  const canNext = data ? page * data.pageSize < data.total : false

  const act = async (payload: any) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })
      const json = (await res.json().catch(() => null)) as any
      if (!res.ok) throw new Error(json?.error || "Action failed")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed")
    } finally {
      setSaving(false)
      setConfirm(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">Review and resolve event reports.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={isLoading}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="md:col-span-2">
              <Input value={q} onChange={(e) => {
                setPage(1)
                setQ(e.target.value)
              }} placeholder="Search reason/details/event title..." />
            </div>
            <div>
              <Select value={status} onValueChange={(v) => {
                setPage(1)
                setStatus(v as any)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="REVIEWED">Reviewed</SelectItem>
                  <SelectItem value="DISMISSED">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Input value={eventId} onChange={(e) => {
                setPage(1)
                setEventId(e.target.value)
              }} placeholder="Event ID (optional)" />
            </div>
            <Button
              onClick={() => {
                setPage(1)
                void load()
              }}
              disabled={isLoading}
            >
              <Search className="mr-2 h-4 w-4" />
              Apply
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input type="date" value={from} onChange={(e) => {
              setPage(1)
              setFrom(e.target.value)
            }} />
            <Input type="date" value={to} onChange={(e) => {
              setPage(1)
              setTo(e.target.value)
            }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.reports ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div>{new Date(r.createdAt).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{r.id}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.status === "OPEN" ? "destructive" : r.status === "REVIEWED" ? "default" : "secondary"}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium max-w-[260px] truncate">{r.reason}</div>
                    {r.details ? <div className="text-xs text-muted-foreground max-w-[260px] truncate">{r.details}</div> : null}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium max-w-[280px] truncate">{r.event.title}</div>
                    <div className="text-xs text-muted-foreground">{r.event.isCancelled ? "CANCELLED" : "ACTIVE"}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{r.eventId}</div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[240px] truncate">{r.reporter.name}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{r.reporter.email}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirm({ type: "SET_STATUS", reportId: r.id, nextStatus: "REVIEWED", title: r.event.title })}
                        disabled={saving || r.status === "REVIEWED"}
                      >
                        Mark reviewed
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirm({ type: "SET_STATUS", reportId: r.id, nextStatus: "DISMISSED", title: r.event.title })}
                        disabled={saving || r.status === "DISMISSED"}
                      >
                        Dismiss
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirm({ type: "CANCEL_EVENT", reportId: r.id, eventId: r.eventId, title: r.event.title })}
                        disabled={saving || r.event.isCancelled}
                      >
                        Cancel event
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {!isLoading && (data?.reports?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No reports found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {data ? (
                <span>
                  Page {data.page} of {Math.max(1, Math.ceil(data.total / data.pageSize))} • {data.total.toLocaleString()} total
                </span>
              ) : (
                <span>—</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canPrev || isLoading}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!canNext || isLoading}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open) setConfirm(null)
        }}
        title={
          confirm?.type === "CANCEL_EVENT"
            ? "Cancel event"
            : confirm?.nextStatus === "DISMISSED"
              ? "Dismiss report"
              : "Mark report reviewed"
        }
        description={
          confirm?.type === "CANCEL_EVENT"
            ? `This will cancel “${confirm?.title || "this event"}” and mark the report as REVIEWED.`
            : `This will update the report status for “${confirm?.title || "this event"}."`
        }
        confirmLabel={confirm?.type === "CANCEL_EVENT" ? "Cancel event" : "Confirm"}
        tone={confirm?.type === "CANCEL_EVENT" ? "danger" : "default"}
        loading={saving}
        onConfirm={() => {
          if (!confirm) return
          if (confirm.type === "CANCEL_EVENT") {
            void act({ reportId: confirm.reportId, action: "CANCEL_EVENT" })
            return
          }
          void act({ reportId: confirm.reportId, action: "SET_STATUS", status: confirm.nextStatus })
        }}
      />
    </div>
  )
}
