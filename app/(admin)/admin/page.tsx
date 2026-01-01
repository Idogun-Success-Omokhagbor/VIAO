"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { RefreshCcw } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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

type Role = "USER" | "ORGANIZER" | "ADMIN"
type ReportStatus = "OPEN" | "REVIEWED" | "DISMISSED"

type OverviewResponse = {
  rangeDays: number
  totals: {
    users: number
    organizers: number
    events: number
    publishedEvents: number
    openReports: number
    boostRevenueAllTime: number
    boostRevenueRange: number
    currency: string
  }
  recent: {
    users: Array<{ id: string; name: string; email: string; role: Role; createdAt: string }>
    events: Array<{ id: string; title: string; status: string; isCancelled: boolean; createdAt: string; organizerId: string }>
    reports: Array<{ id: string; reason: string; status: ReportStatus; createdAt: string; eventId: string; reporterId: string }>
    receipts: Array<{
      id: string
      createdAt: string
      level: number
      amount: number
      currency: string
      eventTitle: string
      eventId: string
      organizerId: string
      organizer: { id: string; name: string; email: string } | null
    }>
  }
}

function formatMoney(amountMinor: number, currency: string) {
  const value = (amountMinor ?? 0) / 100
  const curr = (currency || "chf").toUpperCase()
  return new Intl.NumberFormat(undefined, { style: "currency", currency: curr }).format(value)
}

function roleBadgeVariant(role: Role): "default" | "secondary" | "outline" {
  if (role === "ADMIN") return "default"
  if (role === "ORGANIZER") return "secondary"
  return "outline"
}

function reportBadgeVariant(status: ReportStatus): "default" | "secondary" | "outline" {
  if (status === "OPEN") return "default"
  if (status === "REVIEWED") return "secondary"
  return "outline"
}

export default function AdminDashboardPage() {
  const [rangeDays, setRangeDays] = useState<"7" | "30" | "90">("30")
  const [data, setData] = useState<OverviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    params.set("rangeDays", rangeDays)
    return params.toString()
  }, [rangeDays])

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/overview?${query}`, { credentials: "include", cache: "no-store" })
      const json = (await res.json().catch(() => null)) as any
      if (!res.ok) throw new Error(json?.error || "Failed to load admin overview")
      setData(json as OverviewResponse)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load admin overview")
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [query])

  const totals = data?.totals

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of the platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-44">
            <Select value={rangeDays} onValueChange={(v) => setRangeDays(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={load} disabled={isLoading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totals ? totals.users.toLocaleString() : "—"}</div>
            <div className="text-xs text-muted-foreground">Organizers: {totals ? totals.organizers.toLocaleString() : "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totals ? totals.publishedEvents.toLocaleString() : "—"}</div>
            <div className="text-xs text-muted-foreground">Published & active</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Boost Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {totals ? formatMoney(totals.boostRevenueRange, totals.currency) : "—"}
            </div>
            <div className="text-xs text-muted-foreground">In the selected range</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totals ? totals.openReports.toLocaleString() : "—"}</div>
            <div className="text-xs text-muted-foreground">Open reports</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Organizer</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.recent.receipts ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <div className="max-w-[260px] truncate">{r.eventTitle}</div>
                      <div className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[220px] truncate">{r.organizer?.name || "—"}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">{r.organizer?.email || ""}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.level === 2 ? "default" : "secondary"}>{r.level === 2 ? "Premium" : "Basic"}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(r.amount, r.currency)}</TableCell>
                  </TableRow>
                ))}
                {!isLoading && (data?.recent.receipts?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No receipts in this range.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="mt-3 flex justify-end">
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/billing">View billing</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.recent.users ?? []).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <div className="max-w-[200px] truncate">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[240px] truncate">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant(u.role)}>{u.role}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && (data?.recent.users?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No recent users.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="mt-3 flex justify-end">
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/users">Manage users</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Event</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.recent.reports ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium max-w-[520px] truncate">{r.reason}</TableCell>
                  <TableCell>
                    <Badge variant={reportBadgeVariant(r.status)}>{r.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{r.eventId}</TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.recent.reports?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No reports in this range.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
