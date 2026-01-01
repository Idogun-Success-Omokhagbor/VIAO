"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Receipt, Search } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ReceiptItem = {
  id: string
  createdAt: string
  level: number
  amount: number
  currency: string
  boostUntil: string | null
  eventTitle: string
  eventId: string
  boostCheckoutId: string
  receiptUrl?: string | null
  receiptPdfUrl?: string | null
}

function formatMoney(amountMinor: number, currency: string) {
  const value = (amountMinor ?? 0) / 100
  const curr = (currency || "chf").toUpperCase()
  return new Intl.NumberFormat(undefined, { style: "currency", currency: curr }).format(value)
}

function formatDateTime(value: string | null) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a")
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function safeFilename(value: string) {
  return value.replace(/[^a-z0-9\-_ ]/gi, "").trim().replace(/\s+/g, " ").slice(0, 80) || "receipt"
}

export default function ReceiptsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, refresh } = useAuth()

  const [searchQuery, setSearchQuery] = useState("")
  const [searchField, setSearchField] = useState<"all" | "event" | "receipt" | "amount" | "level">("all")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receipts, setReceipts] = useState<ReceiptItem[]>([])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace("/")
      return
    }
    if (user.role !== "ORGANIZER") {
      router.replace("/dashboard")
    }
  }, [authLoading, router, user])

  const fetchReceipts = useCallback(async (opts?: { retryOnUnauthorized?: boolean }) => {
    setIsLoading(true)
    setError(null)
    try {
      const makeRequest = async () => {
        const res = await fetch("/api/receipts", { cache: "no-store", credentials: "include" })
        const data = (await res.json().catch(() => null)) as { receipts?: ReceiptItem[]; error?: string } | null
        return { res, data }
      }

      let { res, data } = await makeRequest()
      if (!res.ok && res.status === 401 && opts?.retryOnUnauthorized) {
        await refresh()
        ;({ res, data } = await makeRequest())
      }

      if (!res.ok) {
        const serverMessage = data?.error
        throw new Error(serverMessage || `Failed to fetch receipts (${res.status})`)
      }

      setReceipts(Array.isArray(data?.receipts) ? data!.receipts : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch receipts")
    } finally {
      setIsLoading(false)
    }
  }, [refresh])

  useEffect(() => {
    if (authLoading) return
    if (!user) return
    if (user.role !== "ORGANIZER") return
    void fetchReceipts({ retryOnUnauthorized: true })
  }, [authLoading, fetchReceipts, user])

  const filteredReceipts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return receipts

    return receipts.filter((r) => {
      const levelLabel = r.level === 2 ? "premium" : "basic"
      const amountText = `${(r.amount ?? 0) / 100}`

      const matches = (value: string) => value.toLowerCase().includes(q)

      if (searchField === "event") return matches(r.eventTitle || "")
      if (searchField === "receipt") return matches(r.id || "")
      if (searchField === "amount") return matches(amountText) || matches(r.currency || "")
      if (searchField === "level") return matches(levelLabel)

      return (
        matches(r.eventTitle || "") ||
        matches(r.id || "") ||
        matches(amountText) ||
        matches(r.currency || "") ||
        matches(levelLabel)
      )
    })
  }, [receipts, searchField, searchQuery])

  const totals = useMemo(() => {
    const totalAmount = filteredReceipts.reduce((sum, r) => sum + (r.amount ?? 0), 0)
    const currency = filteredReceipts[0]?.currency || "chf"
    return { totalAmount, currency }
  }, [filteredReceipts])

  if (authLoading || !user || user.role !== "ORGANIZER") {
    return (
      <div className="h-full min-h-0 bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 bg-gray-50 overflow-y-auto">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Receipt className="h-7 w-7" />
                Receipts
              </h1>
              <p className="text-gray-600 mt-1">All receipts from boosting your events.</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm text-gray-500">Total in view</div>
                <div className="text-lg font-semibold text-gray-900">{formatMoney(totals.totalAmount, totals.currency)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Search receipts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-full md:w-56">
                <Select value={searchField} onValueChange={(v) => setSearchField(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All fields</SelectItem>
                    <SelectItem value="event">Event title</SelectItem>
                    <SelectItem value="receipt">Receipt ID</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                    <SelectItem value="level">Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => void fetchReceipts({ retryOnUnauthorized: true })}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? "Loading..." : "Refresh"}
              </Button>
            </div>
            {error ? <div className="mt-4 text-sm text-red-600">{error}</div> : null}
          </CardContent>
        </Card>

        {filteredReceipts.length === 0 && !isLoading ? (
          <div className="text-center py-16">
            <div className="mx-auto w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center">
              <Receipt className="h-7 w-7 text-purple-700" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">No receipts yet</h2>
            <p className="mt-2 text-gray-600">When you boost an event, your receipts will show up here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredReceipts.map((r) => (
              <ReceiptCard key={r.id} receipt={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ReceiptCard({ receipt }: { receipt: ReceiptItem }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [opening, setOpening] = useState(false)

  const handleOpenReceipt = () => {
    if (!receipt.receiptUrl) return
    setOpening(true)
    try {
      window.open(receipt.receiptUrl, "_blank", "noopener,noreferrer")
    } finally {
      setOpening(false)
    }
  }

  const levelLabel = receipt.level === 2 ? "Premium" : "Basic"

  return (
    <Card className="overflow-hidden border border-gray-200 shadow-sm">
      <div ref={cardRef} className="bg-white">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-gray-500">Receipt</div>
              <div className="text-lg font-semibold text-gray-900 truncate">{receipt.eventTitle}</div>
              <div className="mt-1 text-sm text-gray-600">{formatDateTime(receipt.createdAt)}</div>
            </div>

            <Badge className={receipt.level === 2 ? "bg-purple-600" : "bg-blue-600"}>{levelLabel} Boost</Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Amount</div>
              <div className="text-base font-semibold text-gray-900">{formatMoney(receipt.amount, receipt.currency)}</div>
            </div>
            <div className="rounded-lg border bg-gray-50 p-3">
              <div className="text-xs text-gray-500">Boost until</div>
              <div className="text-sm font-medium text-gray-900">{receipt.boostUntil ? formatDateTime(receipt.boostUntil) : "—"}</div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg border border-dashed bg-white p-3">
            <div className="text-xs text-gray-500">Receipt ID</div>
            <div className="text-xs font-mono text-gray-700 truncate max-w-[60%]">{receipt.id}</div>
          </div>
        </div>
      </div>

      <div className="border-t bg-gray-50 p-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="text-xs text-gray-500">Receipt</div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenReceipt} disabled={!receipt.receiptUrl || opening}>
            {opening ? "Opening..." : "Receipt"}
          </Button>
        </div>
      </div>
    </Card>
  )
}
