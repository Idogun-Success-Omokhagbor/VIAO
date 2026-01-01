"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/confirm-dialog"

function getSafeImageSrc(src?: string | null) {
  if (!src) return "/placeholder.svg"
  return src
}

type AdminEventDetails = {
  id: string
  title: string
  description: string
  date: string
  timeLabel: string | null
  location: string
  startsAt: string | null
  endsAt: string | null
  city: string | null
  venue: string | null
  address: string | null
  lat: number | null
  lng: number | null
  status: "DRAFT" | "PUBLISHED"
  isCancelled: boolean
  cancelledAt: string | null
  category: string
  imageUrl: string | null
  imageUrls: string[]
  price: number | null
  isBoosted: boolean
  boostLevel: number
  boostUntil: string | null
  maxAttendees: number | null
  createdAt: string
  updatedAt: string
  organizerId: string
  organizer: { id: string; name: string | null; email: string }
  counts: {
    rsvps: number
    saves: number
    reports: number
    openReports: number
  }
}

type DetailsResponse = { event: AdminEventDetails }

type PendingAction = { eventId: string; action: "CANCEL" | "UNCANCEL"; title: string } | null

export default function AdminEventDetailsPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [data, setData] = useState<DetailsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [confirm, setConfirm] = useState<PendingAction>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/events/${id}`, { credentials: "include", cache: "no-store" })
      const json = (await res.json().catch(() => null)) as any
      if (!res.ok) throw new Error(json?.error || "Failed to load event")
      setData(json as DetailsResponse)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load event")
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [id])

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

  const event = data?.event ?? null
  const images = event
    ? Array.isArray(event.imageUrls) && event.imageUrls.length > 0
      ? event.imageUrls
      : event.imageUrl
        ? [event.imageUrl]
        : []
    : []
  const [imageIndex, setImageIndex] = useState(0)

  useEffect(() => {
    setImageIndex(0)
  }, [event?.id])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Event Details</h1>
          <p className="text-sm text-muted-foreground">View full event information.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/admin/events")}>Back</Button>
          {event && (
            <Button
              variant={event.isCancelled ? "outline" : "destructive"}
              onClick={() =>
                setConfirm({
                  eventId: event.id,
                  action: event.isCancelled ? "UNCANCEL" : "CANCEL",
                  title: event.title,
                })
              }
              disabled={saving}
            >
              {event.isCancelled ? "Uncancel" : "Cancel"}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>
      )}

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}

      {!isLoading && !event && !error && <div className="text-sm text-muted-foreground">Event not found.</div>}

      {event && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <div className="relative">
                <div className="relative h-64 md:h-80 overflow-hidden rounded-t-lg">
                  <img
                    src={getSafeImageSrc(images[imageIndex] ?? event.imageUrl)}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition-colors"
                      >
                        <span className="sr-only">Previous image</span>
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageIndex((prev) => (prev + 1) % images.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition-colors"
                      >
                        <span className="sr-only">Next image</span>
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}

                  {event.isCancelled && (
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-gray-900 text-white">Cancelled</Badge>
                    </div>
                  )}
                </div>
              </div>

              <CardHeader>
                <CardTitle className="text-base">{event.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={event.status === "PUBLISHED" ? "default" : "secondary"}>{event.status}</Badge>
                  <Badge variant={event.isCancelled ? "destructive" : "outline"}>{event.isCancelled ? "CANCELLED" : "ACTIVE"}</Badge>
                  <Badge variant={event.isBoosted ? "default" : "outline"}>{event.isBoosted ? `BOOST x${event.boostLevel}` : "NOT BOOSTED"}</Badge>
                  {event.boostUntil && <span className="text-xs text-muted-foreground">Boost until {new Date(event.boostUntil).toLocaleString()}</span>}
                </div>

                <div className="text-sm text-muted-foreground font-mono break-all">{event.id}</div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Date</div>
                    <div className="text-sm">{new Date(event.date).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Category</div>
                    <div className="text-sm">{event.category}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">City</div>
                    <div className="text-sm">{event.city || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Location</div>
                    <div className="text-sm">{event.location}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Venue</div>
                    <div className="text-sm">{event.venue || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Address</div>
                    <div className="text-sm">{event.address || "—"}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Description</div>
                  <div className="whitespace-pre-wrap text-sm">{event.description}</div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <Link className="text-primary hover:underline" href={`/events/${event.id}`} target="_blank">
                    Open public event page
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Organizer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm font-medium">{event.organizer?.name || "—"}</div>
                <div className="text-xs text-muted-foreground font-mono break-all">{event.organizer?.email || ""}</div>
                <div className="text-xs text-muted-foreground font-mono break-all">{event.organizerId}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Counts</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                RSVPs: {event.counts.rsvps.toLocaleString()}
                <br />
                Saves: {event.counts.saves.toLocaleString()}
                <br />
                Reports: {event.counts.reports.toLocaleString()}
                <br />
                Open reports: {event.counts.openReports.toLocaleString()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Meta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Created:</span> {new Date(event.createdAt).toLocaleString()}
                </div>
                <div>
                  <span className="text-muted-foreground">Updated:</span> {new Date(event.updatedAt).toLocaleString()}
                </div>
                {event.cancelledAt && (
                  <div>
                    <span className="text-muted-foreground">Cancelled:</span> {new Date(event.cancelledAt).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open) setConfirm(null)
        }}
        title={confirm?.action === "CANCEL" ? "Cancel event" : "Uncancel event"}
        description={
          confirm?.action === "CANCEL"
            ? `This will mark “${confirm?.title || "this event"}” as cancelled.`
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
