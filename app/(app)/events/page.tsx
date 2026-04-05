"use client"

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { AppImage } from "@/components/ui/app-image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Calendar, MapPin, Users, Plus, Zap, BarChart3, Crown, Pencil, Ban, FileDown, Info, Trash2 } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import type { EventModalProps } from "@/components/event-modal"
import type { EventFormProps } from "@/components/event-form"
import type { Event } from "@/types/event"
import type { PaymentModalProps } from "@/components/payment-modal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatBoostCountdown, getBoostCountdownToneClass, getLocationString } from "@/lib/utils"
import { getEventCategoryColor } from "@/lib/event-categories"
import { getErrorMessage, readJsonOrNull } from "@/lib/http"

const EventModal = dynamic<EventModalProps>(() => import("@/components/event-modal"), { ssr: false })
const EventForm = dynamic<EventFormProps>(() => import("@/components/event-form"), { ssr: false })
const PaymentModal = dynamic<PaymentModalProps>(() => import("@/components/payment-modal"), { ssr: false })

export default function EventsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const isOrganizer = user?.role === "ORGANIZER"
  const [showEventModal, setShowEventModal] = useState<Event | null>(null)
  const [showEventForm, setShowEventForm] = useState(false)
  const [organizerEvents, setOrganizerEvents] = useState<Event[]>([])
  const [organizerLoading, setOrganizerLoading] = useState(false)
  const [organizerError, setOrganizerError] = useState<string | null>(null)
  const [organizerTab, setOrganizerTab] = useState<OrganizerTab>("upcoming")
  const [editEvent, setEditEvent] = useState<Event | null>(null)
  const [boostEvent, setBoostEvent] = useState<Event | null>(null)
  const [boostLevel, setBoostLevel] = useState<number>(0)
  const [attendeesEvent, setAttendeesEvent] = useState<Event | null>(null)
  const [attendees, setAttendees] = useState<
    Array<{ id: string; status: "GOING" | "MAYBE" | "NOT_GOING"; createdAt: string; user: { id: string; name: string; email: string; avatarUrl?: string | null } }>
  >([])
  const [attendeesLoading, setAttendeesLoading] = useState(false)
  const [attendeesSearch, setAttendeesSearch] = useState("")
  const [attendeesRecentOnly, setAttendeesRecentOnly] = useState(false)
  const [deleteEvent, setDeleteEvent] = useState<Event | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [nowTick, setNowTick] = useState(() => Date.now())
  const deferredAttendeesSearch = useDeferredValue(attendeesSearch)

  type OrganizerTab = "upcoming" | "past" | "drafts" | "cancelled"
  type AttendeeRsvp = {
    id: string
    status: "GOING" | "MAYBE" | "NOT_GOING"
    createdAt: string
    user: { id: string; name: string; email: string; avatarUrl?: string | null }
  }
  type OrganizedEventsResponse = { events?: Event[]; error?: string }
  type AttendeesResponse = { rsvps?: AttendeeRsvp[]; error?: string }
  type EventMutationResponse = { event?: Event; error?: string }

  const isOrganizerTab = (value: string): value is OrganizerTab =>
    value === "upcoming" || value === "past" || value === "drafts" || value === "cancelled"

  const applyOrganizerEventUpdate = (updatedEvent: Event) => {
    setOrganizerEvents((prev) => prev.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)))
  }

  useEffect(() => {
    const t = window.setInterval(() => setNowTick(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [])

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

  const refreshOrganizerEvents = useCallback(async () => {
    setOrganizerLoading(true)
    setOrganizerError(null)
    try {
      const res = await fetch("/api/events/me/organized", { cache: "no-store", credentials: "include" })
      const data = await readJsonOrNull<OrganizedEventsResponse>(res)
      if (!res.ok) throw new Error(getErrorMessage(data, "Failed to load events"))
      const events = Array.isArray(data?.events) ? data.events : []
      setOrganizerEvents(events)
    } catch (err) {
      setOrganizerError(err instanceof Error ? err.message : "Failed to load events")
    } finally {
      setOrganizerLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading || !user) return
    if (user.role !== "ORGANIZER") return
    void refreshOrganizerEvents()
  }, [authLoading, refreshOrganizerEvents, user])

  const {
    organizerUpcoming,
    attendeesThisMonth,
    boostsPurchased,
    sparkline,
    activeOrganizerEvents,
  } = useMemo(() => {
    const organizerNow = nowTick
    const drafts = organizerEvents.filter((event) => (event.status ?? "PUBLISHED") === "DRAFT" && !event.isCancelled)
    const upcoming = organizerEvents.filter(
      (event) => (event.status ?? "PUBLISHED") !== "DRAFT" && !event.isCancelled && new Date(event.startsAt ?? event.date).getTime() > organizerNow,
    )
    const past = organizerEvents.filter(
      (event) => (event.status ?? "PUBLISHED") !== "DRAFT" && !event.isCancelled && new Date(event.startsAt ?? event.date).getTime() <= organizerNow,
    )
    const cancelled = organizerEvents.filter((event) => Boolean(event.isCancelled))

    const organizerEventsThisMonth = organizerEvents.filter((event) => {
      const eventDate = new Date(event.startsAt ?? event.date)
      const now = new Date()
      return eventDate.getFullYear() === now.getFullYear() && eventDate.getMonth() === now.getMonth()
    })

    const monthSparkline = Array.from({ length: 12 }, (_, offset) => {
      const monthDate = new Date()
      monthDate.setMonth(monthDate.getMonth() - (11 - offset), 1)

      const count = organizerEvents.filter((event) => {
        const createdAt = new Date(event.createdAt)
        return createdAt.getFullYear() === monthDate.getFullYear() && createdAt.getMonth() === monthDate.getMonth()
      }).length

      return { v: count }
    })

    const visibleEvents =
      organizerTab === "upcoming"
        ? upcoming
        : organizerTab === "past"
          ? past
          : organizerTab === "cancelled"
            ? cancelled
            : drafts

    return {
      organizerUpcoming: upcoming,
      attendeesThisMonth: organizerEventsThisMonth.reduce((sum, event) => sum + (event.attendeesCount ?? 0), 0),
      boostsPurchased: organizerEvents.filter((event) => Boolean(event.isBoosted)).length,
      sparkline: monthSparkline,
      activeOrganizerEvents: visibleEvents,
    }
  }, [nowTick, organizerEvents, organizerTab])

  const filteredAttendees = useMemo(() => {
    const normalizedSearch = deferredAttendeesSearch.trim().toLowerCase()

    return attendees
      .filter((attendee) => {
        if (!normalizedSearch) return true
        return (
          attendee.user.name.toLowerCase().includes(normalizedSearch) ||
          attendee.user.email.toLowerCase().includes(normalizedSearch)
        )
      })
      .filter((attendee) => {
        if (!attendeesRecentOnly) return true
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
        return new Date(attendee.createdAt).getTime() >= cutoff
      })
  }, [attendees, attendeesRecentOnly, deferredAttendeesSearch])

  if (authLoading || !user) {
    return (
      <div className="h-full min-h-0 bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!isOrganizer) {
    return null
  }

  const emptyState = (() => {
    switch (organizerTab) {
      case "drafts":
        return {
          title: "No drafts yet",
          description: "Start a draft to save your event details and publish when you’re ready.",
          cta: "Create draft",
        }
      case "cancelled":
        return {
          title: "No cancelled events",
          description: "Good news — you haven’t cancelled any events.",
          cta: "Create event",
        }
      case "past":
        return {
          title: "No past events",
          description: "Once your events end, they’ll appear here for quick reference.",
          cta: "Create event",
        }
      case "upcoming":
      default:
        return {
          title: "No upcoming events",
          description: "Create your next event and start gathering RSVPs.",
          cta: "Create event",
        }
    }
  })()

  const loadAttendees = async (eventId: string) => {
    setAttendeesLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/attendees`, { cache: "no-store", credentials: "include" })
      const data = await readJsonOrNull<AttendeesResponse>(res)
      if (!res.ok) throw new Error(getErrorMessage(data, "Failed to load attendees"))
      setAttendees(Array.isArray(data?.rsvps) ? data.rsvps : [])
    } catch {
      setAttendees([])
    } finally {
      setAttendeesLoading(false)
    }
  }

  const exportAttendeesCsv = () => {
    if (!attendeesEvent) return
    const header = ["name", "email", "status", "createdAt"].join(",")
    const rows = attendees.map((r) => {
      const safe = (value: string) => `"${String(value).replace(/"/g, '""')}"`
      return [safe(r.user.name), safe(r.user.email), safe(r.status), safe(r.createdAt)].join(",")
    })
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `attendees-${attendeesEvent.id}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    if (!deleteEvent) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/events/${deleteEvent.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || "Failed to delete event")

      setOrganizerEvents((prev) => prev.filter((e) => e.id !== deleteEvent.id))
      if (showEventModal?.id === deleteEvent.id) setShowEventModal(null)
      if (editEvent?.id === deleteEvent.id) setEditEvent(null)
      if (boostEvent?.id === deleteEvent.id) setBoostEvent(null)
      if (attendeesEvent?.id === deleteEvent.id) setAttendeesEvent(null)
      setDeleteEvent(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete event"
      window.alert(message)
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="h-full min-h-0 bg-gray-50 overflow-y-auto">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Events</h1>
              <p className="text-gray-600 mt-1">Manage your events, RSVPs, and boosts.</p>
            </div>
            <Button onClick={() => setShowEventForm(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <TooltipProvider>
          <div className="space-y-6 mb-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-blue-100 bg-blue-50/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span>Total Events Created</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-gray-500 hover:text-gray-700">
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Total number of events you’ve created.</TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{organizerEvents.length}</div>
                      <div className="text-xs text-gray-600">All time</div>
                    </div>
                    <div className="h-10 w-24">
                      <Sparkline points={sparkline} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-emerald-100 bg-emerald-50/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span>Upcoming Events</span>
                    <Calendar className="h-4 w-4 text-emerald-700" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-gray-900">{organizerUpcoming.length}</div>
                  <div className="text-xs text-gray-600">Scheduled in the future</div>
                </CardContent>
              </Card>

              <Card className="border-purple-100 bg-purple-50/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span>Attendees This Month</span>
                    <Users className="h-4 w-4 text-purple-700" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-gray-900">{attendeesThisMonth}</div>
                  <div className="text-xs text-gray-600">GOING RSVPs</div>
                </CardContent>
              </Card>

              <Card className="border-amber-100 bg-amber-50/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span>Boosts Purchased</span>
                    <Zap className="h-4 w-4 text-amber-700" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-gray-900">{boostsPurchased}</div>
                  <div className="text-xs text-gray-600">Currently boosted</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-700" />
                    My Events
                  </span>
                  <div className="text-xs text-muted-foreground">Manage quickly from here</div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {organizerError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{organizerError}</div>
                ) : organizerLoading ? (
                  <div className="text-sm text-gray-600">Loading your events…</div>
                ) : (
                  <Tabs
                    value={organizerTab}
                    onValueChange={(value) => {
                      if (isOrganizerTab(value)) setOrganizerTab(value)
                    }}
                  >
                    <TabsList className="w-full justify-start">
                      <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                      <TabsTrigger value="past">Past</TabsTrigger>
                      <TabsTrigger value="drafts">Drafts</TabsTrigger>
                      <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                    </TabsList>

                    <TabsContent value={organizerTab}>
                      {activeOrganizerEvents.length === 0 ? (
                        <div className="py-10">
                          <div className="mx-auto max-w-2xl">
                            <div className="rounded-2xl border bg-gradient-to-br from-white via-white to-purple-50 p-8 shadow-sm">
                              <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                                <div className="h-12 w-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
                                  <Calendar className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                  <div className="text-lg sm:text-xl font-semibold text-gray-900">{emptyState.title}</div>
                                  <div className="mt-1 text-sm text-gray-600 leading-relaxed">{emptyState.description}</div>

                                  <div className="mt-5 flex flex-col sm:flex-row gap-2">
                                    <Button
                                      className="bg-purple-600 hover:bg-purple-700"
                                      onClick={() => setShowEventForm(true)}
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      {emptyState.cta}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() => setOrganizerTab("upcoming")}
                                    >
                                      View upcoming
                                    </Button>
                                  </div>

                                  <div className="mt-4 text-xs text-gray-500">
                                    Tip: Premium boosts show your event first and increase visibility.
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {activeOrganizerEvents.map((event) => {
                            const effectiveLevel = typeof event.boostLevel === "number" ? event.boostLevel : event.isBoosted ? 1 : 0
                            const boostCountdown = formatBoostCountdown(event.boostUntil, nowTick)
                            const countdownToneClass = getBoostCountdownToneClass(event.boostUntil, nowTick)
                            return (
                              <Card
                                key={event.id}
                                className={`overflow-hidden transition-all duration-200 ${
                                  event.isBoosted ? "ring-2 ring-yellow-400 ring-opacity-50" : ""
                                }`}
                              >
                                <div className="relative">
                                  <AppImage
                                    src={event.imageUrls && event.imageUrls.length > 0 ? event.imageUrls[0] : event.imageUrl}
                                    alt={event.title}
                                    width={800}
                                    height={320}
                                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                                    className="w-full h-40 object-cover"
                                  />
                                  <div className="absolute top-2 left-2 flex gap-2">
                                    {(event.status ?? "PUBLISHED") === "DRAFT" && !event.isCancelled && (
                                      <Badge className="bg-slate-700">Draft</Badge>
                                    )}
                                    {event.isCancelled && <Badge className="bg-gray-800">Cancelled</Badge>}
                                    {event.isBoosted && !event.isCancelled ? (
                                      effectiveLevel >= 2 ? (
                                        <Badge className="bg-purple-600 text-white">Premium</Badge>
                                      ) : (
                                        <Badge className="bg-yellow-400 text-yellow-900">Boosted</Badge>
                                      )
                                    ) : null}
                                  {event.isBoosted && !event.isCancelled && boostCountdown ? (
                                    <Badge className={countdownToneClass}>{boostCountdown}</Badge>
                                  ) : null}
                                    {typeof event.maxAttendees === "number" && (event.attendeesCount ?? 0) >= event.maxAttendees && (
                                      <Badge className="bg-rose-600">Sold Out</Badge>
                                    )}
                                  </div>
                                  <div className="absolute top-2 right-2">
                                    <Badge variant="secondary" className="bg-white/90 text-gray-800">
                                      <span
                                        className={`inline-block h-3 w-3 rounded-full mr-2 ${getEventCategoryColor(event.category)}`}
                                      />
                                      {event.category}
                                    </Badge>
                                  </div>
                                </div>

                                <CardHeader className="pb-2">
                                  <CardTitle className="text-base line-clamp-1">{event.title}</CardTitle>
                                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>{new Date(event.startsAt ?? event.date).toLocaleString()}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span className="truncate">{getLocationString(event.location)}</span>
                                  </div>
                                </CardHeader>

                                <CardContent className="pt-0 space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2 text-gray-700">
                                    <Users className="h-4 w-4" />
                                    <span>
                                      {event.attendeesCount ?? 0}
                                      {typeof event.maxAttendees === "number" ? `/${event.maxAttendees}` : ""}
                                    </span>
                                  </div>
                                  <div className="font-semibold text-gray-800">{event.price === 0 ? "Free" : `CHF ${event.price ?? 0}`}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <Button variant="outline" size="sm" onClick={() => setShowEventModal(event)}>
                                    View
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => setEditEvent(event)}>
                                    <Pencil className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setAttendeesEvent(event)
                                      setAttendeesSearch("")
                                      setAttendeesRecentOnly(false)
                                      void loadAttendees(event.id)
                                    }}
                                    disabled={(event.status ?? "PUBLISHED") === "DRAFT"}
                                  >
                                    <Users className="h-4 w-4 mr-1" />
                                    Attendees
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="bg-purple-600 hover:bg-purple-700"
                                    onClick={() => {
                                      setBoostLevel(0)
                                      setBoostEvent(event)
                                    }}
                                    disabled={
                                      event.isCancelled ||
                                      (event.status ?? "PUBLISHED") === "DRAFT" ||
                                      false
                                    }
                                  >
                                    <Crown className="h-4 w-4 mr-1" />
                                    Boost
                                  </Button>
                                </div>

                                {(event.status ?? "PUBLISHED") === "DRAFT" && !event.isCancelled ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={async () => {
                                      try {
                                        const res = await fetch(`/api/events/${event.id}`, {
                                          method: "PUT",
                                          headers: { "Content-Type": "application/json" },
                                          credentials: "include",
                                          body: JSON.stringify({ status: "PUBLISHED" }),
                                        })
                                        if (!res.ok) return
                                        const data = await readJsonOrNull<EventMutationResponse>(res)
                                        if (data?.event) {
                                          applyOrganizerEventUpdate(data.event)
                                        }
                                      } catch {
                                      }
                                    }}
                                  >
                                    Publish
                                  </Button>
                                ) : null}

                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={async () => {
                                      if (!window.confirm("Cancel this event?")) return
                                      try {
                                        const res = await fetch(`/api/events/${event.id}`, {
                                          method: "PUT",
                                          headers: { "Content-Type": "application/json" },
                                          credentials: "include",
                                          body: JSON.stringify({ isCancelled: true }),
                                        })
                                        if (!res.ok) return
                                        const data = await readJsonOrNull<EventMutationResponse>(res)
                                        if (data?.event) {
                                          applyOrganizerEventUpdate(data.event)
                                        }
                                      } catch {
                                      }
                                    }}
                                    disabled={event.isCancelled}
                                  >
                                    <Ban className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => setDeleteEvent(event)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                                </CardContent>
                              </Card>
                            )
                          })}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        </TooltipProvider>
      </div>

      {showEventModal && (
        <div
          className="fixed inset-0 z-[4000] bg-black/50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto"
          onClick={() => setShowEventModal(null)}
        >
          <div className="max-w-4xl w-full max-h-[92dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <EventModal event={showEventModal!} onClose={() => setShowEventModal(null)} />
          </div>
        </div>
      )}

      {showEventForm && (
        <div className="fixed inset-0 z-[4000] bg-black/50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[92dvh] overflow-y-auto">
            <EventForm onClose={() => setShowEventForm(false)} />
          </div>
        </div>
      )}

      {editEvent && (
        <div className="fixed inset-0 z-[4000] bg-black/50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[92dvh] overflow-y-auto">
            <EventForm onClose={() => setEditEvent(null)} mode="edit" event={editEvent} />
          </div>
        </div>
      )}

      {boostEvent && (
        <PaymentModal
          isOpen={!!boostEvent}
          onClose={() => setBoostEvent(null)}
          eventId={boostEvent.id}
          eventTitle={boostEvent.title}
          boostLevel={boostLevel}
        />
      )}

      <Dialog open={!!attendeesEvent} onOpenChange={(open) => (!open ? setAttendeesEvent(null) : null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span className="truncate">Attendees · {attendeesEvent?.title}</span>
              <Button type="button" variant="outline" size="sm" onClick={exportAttendeesCsv} disabled={attendeesLoading || attendees.length === 0}>
                <FileDown className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input placeholder="Search attendees..." value={attendeesSearch} onChange={(e) => setAttendeesSearch(e.target.value)} />
              <Button type="button" variant={attendeesRecentOnly ? "default" : "outline"} onClick={() => setAttendeesRecentOnly((v) => !v)}>
                Recent only
              </Button>
            </div>

            {attendeesLoading ? (
              <div className="text-sm text-muted-foreground">Loading attendees…</div>
            ) : filteredAttendees.length === 0 ? (
              <div className="text-sm text-muted-foreground">No attendees found.</div>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto border rounded-md">
                {filteredAttendees.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-b-0">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{r.user.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.user.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          r.status === "GOING" ? "bg-emerald-600" : r.status === "MAYBE" ? "bg-amber-500" : "bg-gray-700"
                        }
                      >
                        {r.status === "GOING" ? "Going" : r.status === "MAYBE" ? "Maybe" : "Not going"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAttendeesEvent(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteEvent} onOpenChange={(open) => (!open ? setDeleteEvent(null) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete “{deleteEvent?.title}”. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Sparkline({ points }: { points: Array<{ v: number }> }) {
  if (points.length === 0) return null

  const max = Math.max(...points.map((point) => point.v), 1)
  const coordinates = points
    .map((point, index) => {
      const x = points.length === 1 ? 0 : (index / (points.length - 1)) * 100
      const y = 100 - (point.v / max) * 100
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
      <polyline
        fill="none"
        points={coordinates}
        stroke="#2563eb"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

