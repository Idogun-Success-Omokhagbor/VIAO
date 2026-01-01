"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { RefreshCcw } from "lucide-react"

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
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "@/components/confirm-dialog"

type AdminEvent = {
  id: string
  title: string
  status: "DRAFT" | "PUBLISHED"
  isCancelled: boolean
  cancelledAt: string | null
  city: string | null
  category: string
  createdAt: string
  organizerId: string
  organizer: { id: string; name: string; email: string }
  isBoosted: boolean
  boostLevel: number
  boostUntil: string | null
  counts: {
    rsvps: number
    saves: number
    reports: number
    openReports: number
  }
}

type EventsResponse = {
  page: number
  pageSize: number
  total: number
  events: AdminEvent[]
}

type Tri = "ALL" | "YES" | "NO"

type StatusFilter = "ALL" | "DRAFT" | "PUBLISHED"

type PendingAction = { eventId: string; action: "CANCEL" | "UNCANCEL"; title: string } | null

export default function AdminEventsPage() {
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<StatusFilter>("ALL")
  const [cancelled, setCancelled] = useState<Tri>("ALL")
  const [boosted, setBoosted] = useState<Tri>("ALL")
  const [openReportsOnly, setOpenReportsOnly] = useState(false)
  const [city, setCity] = useState("")
  const [category, setCategory] = useState("")

  const [page, setPage] = useState(1)
  const [data, setData] = useState<EventsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [confirm, setConfirm] = useState<PendingAction>(null)
  const [saving, setSaving] = useState(false)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (q.trim()) params.set("q", q.trim())
    if (status !== "ALL") params.set("status", status)
    if (cancelled !== "ALL") params.set("cancelled", cancelled)
    if (boosted !== "ALL") params.set("boosted", boosted)
    if (openReportsOnly) params.set("openReportsOnly", "1")
    if (city.trim()) params.set("city", city.trim())
    if (category.trim()) params.set("category", category.trim())
    params.set("page", String(page))
    params.set("pageSize", "25")
    return params.toString()
  }, [boosted, cancelled, category, city, openReportsOnly, page, q, status])

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/events?${query}`, { credentials: "include", cache: "no-store" })
      const json = (await res.json().catch(() => null)) as any
      if (!res.ok) throw new Error(json?.error || "Failed to load events")
      setData(json as EventsResponse)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load events")
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

  const mutateCancel = async (eventId: string, action: "CANCEL" | "UNCANCEL") => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ eventId, action }),
      })
      const json = (await res.json().catch(() => null)) as any
      if (!res.ok) throw new Error(json?.error || "Failed to update event")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update event")
    } finally {
      setSaving(false)
      setConfirm(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Events</h1>
          <p className="text-sm text-muted-foreground">Search, filter and cancel events.</p>
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
              }} placeholder="Search by title..." />
            </div>
            <div>
              <Select value={status} onValueChange={(v) => {
                setPage(1)
                setStatus(v as StatusFilter)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={cancelled} onValueChange={(v) => {
                setPage(1)
                setCancelled(v as Tri)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Cancelled" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="NO">Not cancelled</SelectItem>
                  <SelectItem value="YES">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={boosted} onValueChange={(v) => {
                setPage(1)
                setBoosted(v as Tri)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Boosted" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="NO">Not boosted</SelectItem>
                  <SelectItem value="YES">Boosted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input value={city} onChange={(e) => {
              setPage(1)
              setCity(e.target.value)
            }} placeholder="City (optional)" />
            <Input value={category} onChange={(e) => {
              setPage(1)
              setCategory(e.target.value)
            }} placeholder="Category (optional)" />
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <div className="text-sm font-medium">Open reports only</div>
                <div className="text-xs text-muted-foreground">Show events with OPEN reports</div>
              </div>
              <Switch checked={openReportsOnly} onCheckedChange={(v) => {
                setPage(1)
                setOpenReportsOnly(Boolean(v))
              }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Events</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Boost</TableHead>
                <TableHead>City / Category</TableHead>
                <TableHead>Organizer</TableHead>
                <TableHead>Counts</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.events ?? []).map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="font-medium max-w-[320px] truncate">{e.title}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{e.id}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={e.status === "PUBLISHED" ? "default" : "secondary"}>{e.status}</Badge>
                      <Badge variant={e.isCancelled ? "destructive" : "outline"}>{e.isCancelled ? "CANCELLED" : "ACTIVE"}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={e.isBoosted ? "default" : "outline"}>{e.isBoosted ? `BOOST x${e.boostLevel}` : "NOT BOOSTED"}</Badge>
                      <div className="text-xs text-muted-foreground">{e.boostUntil ? new Date(e.boostUntil).toLocaleDateString() : "—"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[220px] truncate">{e.city || "—"}</div>
                    <div className="text-xs text-muted-foreground truncate">{e.category}</div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[220px] truncate">{e.organizer?.name || "—"}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{e.organizer?.email || ""}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      RSVPs: {e.counts.rsvps.toLocaleString()}
                      <br />
                      Saves: {e.counts.saves.toLocaleString()}
                      <br />
                      Open reports: {e.counts.openReports.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(e.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/events/${e.id}`}>View</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant={e.isCancelled ? "outline" : "destructive"}
                        onClick={() =>
                          setConfirm({
                            eventId: e.id,
                            action: e.isCancelled ? "UNCANCEL" : "CANCEL",
                            title: e.title,
                          })
                        }
                        disabled={saving}
                      >
                        {e.isCancelled ? "Uncancel" : "Cancel"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.events?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No events found.
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
        title={confirm?.action === "CANCEL" ? "Cancel event" : "Uncancel event"}
        description={
          confirm?.action === "CANCEL"
            ? `This will mark “${confirm?.title || "this event"}” as cancelled. Users may still see it depending on UI.`
            : `This will mark “${confirm?.title || "this event"}” as active again.`
        }
        confirmLabel={confirm?.action === "CANCEL" ? "Cancel event" : "Uncancel event"}
        tone={confirm?.action === "CANCEL" ? "danger" : "default"}
        loading={saving}
        onConfirm={() => {
          if (!confirm) return
          void mutateCancel(confirm.eventId, confirm.action)
        }}
      />
    </div>
  )
}
