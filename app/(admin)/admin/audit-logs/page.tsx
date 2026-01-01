"use client"

import { useEffect, useMemo, useState } from "react"
import { RefreshCcw, Search } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type AuditLog = {
  id: string
  createdAt: string
  adminId: string
  adminEmail: string
  action: string
  entityType: string
  entityId: string
  before: any
  after: any
  metadata: any
}

type AuditLogsResponse = {
  page: number
  pageSize: number
  total: number
  logs: AuditLog[]
}

export default function AdminAuditLogsPage() {
  const [q, setQ] = useState("")
  const [action, setAction] = useState("")
  const [entityType, setEntityType] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const [page, setPage] = useState(1)
  const [data, setData] = useState<AuditLogsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (q.trim()) params.set("q", q.trim())
    if (action.trim()) params.set("action", action.trim())
    if (entityType.trim()) params.set("entityType", entityType.trim())
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    params.set("page", String(page))
    params.set("pageSize", "50")
    return params.toString()
  }, [action, entityType, from, page, q, to])

  const load = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/audit-logs?${query}`, { credentials: "include", cache: "no-store" })
      const json = (await res.json().catch(() => null)) as any
      if (!res.ok) throw new Error(json?.error || "Failed to load audit logs")
      setData(json as AuditLogsResponse)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit logs")
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Track admin actions for accountability.</p>
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input value={q} onChange={(e) => {
              setPage(1)
              setQ(e.target.value)
            }} placeholder="Search (admin email/action/entity)..." />
            <Input value={action} onChange={(e) => {
              setPage(1)
              setAction(e.target.value)
            }} placeholder="Action (optional)" />
            <Input value={entityType} onChange={(e) => {
              setPage(1)
              setEntityType(e.target.value)
            }} placeholder="Entity type (optional)" />
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
          <CardTitle className="text-base">Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.logs ?? []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div>{new Date(l.createdAt).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{l.id}</div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[220px] truncate">{l.adminEmail}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{l.adminId}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium max-w-[260px] truncate">{l.action}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{l.entityType}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{l.entityId}</div>
                  </TableCell>
                  <TableCell>
                    <details>
                      <summary className="cursor-pointer text-sm text-muted-foreground">View</summary>
                      <pre className="mt-2 max-w-[520px] overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
                        {JSON.stringify(
                          {
                            before: l.before,
                            after: l.after,
                            metadata: l.metadata,
                          },
                          null,
                          2,
                        )}
                      </pre>
                    </details>
                  </TableCell>
                </TableRow>
              ))}

              {!isLoading && (data?.logs?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No logs found.
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
    </div>
  )
}
