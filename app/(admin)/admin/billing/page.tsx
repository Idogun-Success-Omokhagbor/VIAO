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

type BillingResponse = {
  page: number
  pageSize: number
  total: number
  currency: string
  totals: {
    allTime: { amount: number; count: number }
    range: { amount: number; count: number }
  }
  receipts: Array<{
    id: string
    createdAt: string
    level: number
    amount: number
    currency: string
    boostUntil: string | null
    eventTitle: string
    eventId: string
    organizerId: string
    organizer: { id: string; name: string; email: string } | null
  }>
}

function formatMoney(amountMinor: number, currency: string) {
  const value = (amountMinor ?? 0) / 100
  const curr = (currency || "chf").toUpperCase()
  return new Intl.NumberFormat(undefined, { style: "currency", currency: curr }).format(value)
}

export default function AdminBillingPage() {
  const [q, setQ] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<BillingResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (q.trim()) params.set("q", q.trim())
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    params.set("page", String(page))
    params.set("pageSize", "25")
    return params.toString()
  }, [from, page, q, to])

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/billing?${query}`, { credentials: "include", cache: "no-store" })
      const json = (await res.json().catch(() => null)) as any
      if (!res.ok) throw new Error(json?.error || "Failed to load billing")
      setData(json as BillingResponse)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load billing")
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
  const currency = data?.currency ?? "chf"

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Billing</h1>
          <p className="text-sm text-muted-foreground">Boost receipts and revenue overview.</p>
        </div>
        <Button variant="outline" onClick={load} disabled={isLoading}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">All time revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {data ? formatMoney(data.totals.allTime.amount, currency) : "—"}
            </div>
            <div className="text-xs text-muted-foreground">Receipts: {data ? data.totals.allTime.count.toLocaleString() : "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue in range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {data ? formatMoney(data.totals.range.amount, currency) : "—"}
            </div>
            <div className="text-xs text-muted-foreground">Receipts: {data ? data.totals.range.count.toLocaleString() : "—"}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by event title..." />
          </div>
          <div className="w-full md:w-44">
            <Input type="date" value={from} onChange={(e) => {
              setPage(1)
              setFrom(e.target.value)
            }} />
          </div>
          <div className="w-full md:w-44">
            <Input type="date" value={to} onChange={(e) => {
              setPage(1)
              setTo(e.target.value)
            }} />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Organizer</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Boost Until</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.receipts ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="font-medium max-w-[320px] truncate">{r.eventTitle}</TableCell>
                  <TableCell>
                    <div className="max-w-[240px] truncate">{r.organizer?.name || "—"}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{r.organizer?.email || ""}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.level === 2 ? "default" : "secondary"}>{r.level === 2 ? "Premium" : "Basic"}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(r.amount, r.currency)}</TableCell>
                  <TableCell>{r.boostUntil ? new Date(r.boostUntil).toLocaleString() : "—"}</TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.receipts?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No receipts found.
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!canPrev || isLoading}
              >
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={!canNext || isLoading}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
