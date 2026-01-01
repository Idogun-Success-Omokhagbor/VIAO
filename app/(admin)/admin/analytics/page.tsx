"use client"

import { useEffect, useMemo, useState } from "react"
import { RefreshCcw } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

type AnalyticsResponse = {
  rangeDays: number
  currency: string
  totals: { users: number; events: number; reports: number; revenue: number }
  series: Array<{ day: string; users: number; events: number; reports: number; revenue: number }>
}

function formatMoney(amountMinor: number, currency: string) {
  const value = (amountMinor ?? 0) / 100
  const curr = (currency || "chf").toUpperCase()
  return new Intl.NumberFormat(undefined, { style: "currency", currency: curr }).format(value)
}

function formatDay(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export default function AdminAnalyticsPage() {
  const [rangeDays, setRangeDays] = useState<"7" | "30" | "90" | "180">("30")
  const [data, setData] = useState<AnalyticsResponse | null>(null)
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
      const res = await fetch(`/api/admin/analytics?${query}`, { credentials: "include", cache: "no-store" })
      const json = (await res.json().catch(() => null)) as any
      if (!res.ok) throw new Error(json?.error || "Failed to load analytics")
      setData(json as AnalyticsResponse)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics")
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [query])

  const totals = data?.totals
  const series = data?.series ?? []
  const currency = data?.currency ?? "chf"

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Trends across growth, activity, and revenue.</p>
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
                <SelectItem value="180">Last 180 days</SelectItem>
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
            <CardTitle className="text-sm font-medium">New Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totals ? totals.users.toLocaleString() : "—"}</div>
            <div className="text-xs text-muted-foreground">In the selected range</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">New Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totals ? totals.events.toLocaleString() : "—"}</div>
            <div className="text-xs text-muted-foreground">Created in range</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reports Filed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totals ? totals.reports.toLocaleString() : "—"}</div>
            <div className="text-xs text-muted-foreground">Submitted in range</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Boost Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totals ? formatMoney(totals.revenue, currency) : "—"}</div>
            <div className="text-xs text-muted-foreground">Receipts in range</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users">
            <TabsList>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <ChartContainer
                config={{
                  users: { label: "Users", color: "#7c3aed" },
                }}
                className="h-64 w-full"
              >
                <LineChart data={series} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickFormatter={formatDay} />
                  <YAxis tickLine={false} axisLine={false} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="users" stroke="var(--color-users)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="events">
              <ChartContainer
                config={{
                  events: { label: "Events", color: "#2563eb" },
                }}
                className="h-64 w-full"
              >
                <LineChart data={series} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickFormatter={formatDay} />
                  <YAxis tickLine={false} axisLine={false} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="events" stroke="var(--color-events)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="revenue">
              <ChartContainer
                config={{
                  revenue: { label: "Revenue (minor)", color: "#16a34a" },
                }}
                className="h-64 w-full"
              >
                <LineChart data={series} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickFormatter={formatDay} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(v) => {
                      const n = typeof v === "number" ? v : Number(v)
                      if (Number.isNaN(n)) return ""
                      return formatMoney(n, currency)
                    }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => {
                          const n = typeof value === "number" ? value : Number(value)
                          return formatMoney(Number.isNaN(n) ? 0 : n, currency)
                        }}
                      />
                    }
                  />
                  <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="reports">
              <ChartContainer
                config={{
                  reports: { label: "Reports", color: "#f97316" },
                }}
                className="h-64 w-full"
              >
                <LineChart data={series} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickFormatter={formatDay} />
                  <YAxis tickLine={false} axisLine={false} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="reports" stroke="var(--color-reports)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
