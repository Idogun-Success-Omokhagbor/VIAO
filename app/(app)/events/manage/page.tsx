"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { AppImage } from "@/components/ui/app-image"
import { AppSpinner } from "@/components/ui/app-spinner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"
import { ArrowRight, Calendar, CalendarPlus, LayoutGrid, MapPin, Receipt, Users, Zap } from "lucide-react"
import type { EventModalProps } from "@/components/event-modal"
import type { Event } from "@/types/event"

const EventModal = dynamic<EventModalProps>(() => import("@/components/event-modal"), { ssr: false })

type ManageFilter = "all" | "upcoming" | "past" | "cancelled"

export default function ManageEventsPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<ManageFilter>("all")

  useEffect(() => {
    void (async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/events/me/organized", { cache: "no-store", credentials: "include" })
        const data = (await res.json().catch(() => ({}))) as { events?: Event[]; error?: string }
        if (!res.ok) throw new Error(data.error || "Failed to load events")
        setEvents(Array.isArray(data.events) ? data.events : [])
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load events")
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  const selected = selectedId ? events.find((event) => event.id === selectedId) ?? null : null
  const isOrganizer = user?.role === "ORGANIZER"

  const metrics = useMemo(() => {
    const now = Date.now()
    const upcoming = events.filter((event) => !event.isCancelled && new Date(event.startsAt ?? event.date).getTime() > now)
    const past = events.filter((event) => !event.isCancelled && new Date(event.startsAt ?? event.date).getTime() <= now)
    const cancelled = events.filter((event) => Boolean(event.isCancelled))
    const boosted = events.filter((event) => Boolean(event.isBoosted))
    const nearlyFull = events.filter((event) => event.maxAttendees && (event.attendeesCount ?? 0) >= Math.max(1, Math.floor(event.maxAttendees * 0.8)))

    const visible =
      filter === "upcoming"
        ? upcoming
        : filter === "past"
          ? past
          : filter === "cancelled"
            ? cancelled
            : events

    return {
      total: events.length,
      upcoming: upcoming.length,
      past: past.length,
      cancelled: cancelled.length,
      boosted: boosted.length,
      nearlyFull: nearlyFull.length,
      visible,
    }
  }, [events, filter])

  if (!isOrganizer) {
    return (
      <div className="min-h-full bg-gray-50 px-4 py-8">
        <Card className="mx-auto max-w-xl rounded-[24px] border-[#eadfff] shadow-[0_20px_50px_rgba(76,53,160,0.08)]">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f3ecff] text-[#5b34d6]">
              <LayoutGrid className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-[#24183d]">Manage Events</h1>
            <p className="mt-3 text-sm leading-6 text-[#665d87]">
              These tools are reserved for organisers who need to keep event inventory, performance, and follow-up under control.
            </p>
            <Button asChild variant="outline" className="mt-6 rounded-full border-[#d9cdfd]">
              <Link href="/events">Back to events</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-[#fcfaff]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-[#eadfff] bg-[linear-gradient(135deg,#fff_0%,#f8f4ff_56%,#edf7ff_100%)] shadow-[0_24px_60px_rgba(98,59,188,0.08)]">
          <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Badge className="mb-4 rounded-full bg-white/90 px-3 py-1 text-[#5f49be] hover:bg-white">Organizer operations</Badge>
              <h1 className="text-3xl font-semibold tracking-tight text-[#1f1538] sm:text-4xl">Manage Events</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5f5679] sm:text-base">
                Stay on top of what is coming up, what needs attention, and which events deserve action next.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-11 rounded-full bg-[#5b34d6] px-5 shadow-[0_16px_30px_rgba(91,52,214,0.25)] hover:bg-[#4a27bf]">
                <Link href="/events">
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Create or edit events
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-full border-white/70 bg-white/75 px-5 text-[#4c3a95] hover:bg-white">
                <Link href="/receipts">
                  <Receipt className="mr-2 h-4 w-4" />
                  View receipts
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 border-t border-white/70 bg-white/55 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
            <ManageMetric label="Total events" value={metrics.total} description="Everything you currently manage" icon={LayoutGrid} />
            <ManageMetric label="Upcoming" value={metrics.upcoming} description="Events still ahead of go-live" icon={Calendar} />
            <ManageMetric label="Boosted" value={metrics.boosted} description="Currently receiving extra reach" icon={Zap} />
            <ManageMetric label="Nearly full" value={metrics.nearlyFull} description="Good candidates for follow-up or upsell" icon={Users} />
          </div>
        </section>

        <section className="rounded-[24px] border border-[#ece4ff] bg-white p-4 shadow-[0_16px_40px_rgba(98,59,188,0.06)] sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#24183d]">What needs attention now</h2>
              <p className="mt-1 text-sm text-[#6b628d]">A focused pass over the events that still need action, follow-up, or review.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {([
                ["all", "All"],
                ["upcoming", "Upcoming"],
                ["past", "Past"],
                ["cancelled", "Cancelled"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    filter === value ? "bg-[#f0e9ff] text-[#4e35cc]" : "bg-[#faf7ff] text-[#776b9a] hover:text-[#4e35cc]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          {isLoading ? (
            <AppSpinner
              label="Loading your events..."
              size="lg"
              fullHeight
              className="mt-6 rounded-[22px] border border-dashed border-[#ddd1ff] px-6 py-16"
            />
          ) : metrics.visible.length === 0 ? (
            <Card className="mt-6 rounded-[24px] border-dashed border-[#d9cdfd] bg-[#fcfbff] shadow-none">
              <CardContent className="px-6 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f3ecff] text-[#5b34d6]">
                  <Calendar className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-[#24183d]">
                  {filter === "cancelled"
                    ? "No cancelled events"
                    : filter === "past"
                      ? "No past events yet"
                      : filter === "upcoming"
                        ? "No upcoming events"
                        : "No events yet"}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#685f88]">
                  {filter === "all"
                    ? "Create your first event and VIAO will start giving you a clearer operating picture."
                    : "Once an event reaches this state, VIAO will surface it here so you can act quickly."}
                </p>
                <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button asChild className="rounded-full bg-[#5b34d6] hover:bg-[#4a27bf]">
                    <Link href="/events">Create an event</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full border-[#d9cdfd]">
                    <Link href="/receipts">See boost spend</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {metrics.visible.map((event) => {
                const startsAt = new Date(event.startsAt ?? event.date)
                const image = (event.imageUrls && event.imageUrls.length > 0 ? event.imageUrls[0] : event.imageUrl) || "/placeholder.svg"
                const attendanceLabel = event.maxAttendees ? `${event.attendeesCount ?? 0}/${event.maxAttendees}` : `${event.attendeesCount ?? 0}`

                return (
                  <Card
                    key={event.id}
                    className="group overflow-hidden rounded-[24px] border border-[#ece4ff] bg-white shadow-[0_16px_36px_rgba(76,53,160,0.07)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_22px_44px_rgba(76,53,160,0.12)]"
                    onClick={() => setSelectedId(event.id)}
                  >
                    <div className="relative">
                      <AppImage
                        src={image}
                        alt={event.title}
                        width={800}
                        height={384}
                        sizes="(min-width: 1280px) 30vw, (min-width: 768px) 50vw, 100vw"
                        className="h-48 w-full object-cover"
                      />
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                        <Badge variant="secondary" className="rounded-full bg-white/90 text-gray-800 hover:bg-white">
                          {event.category}
                        </Badge>
                        <div className="flex flex-wrap justify-end gap-2">
                          {event.isBoosted ? <Badge className="rounded-full bg-[#5b34d6] hover:bg-[#5b34d6]">Boosted</Badge> : null}
                          {event.isCancelled ? (
                            <Badge variant="secondary" className="rounded-full bg-gray-900 text-white hover:bg-gray-900">
                              Cancelled
                            </Badge>
                          ) : null}
                          {(event.status ?? "PUBLISHED") === "DRAFT" ? (
                            <Badge variant="secondary" className="rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100">
                              Draft
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <CardContent className="space-y-5 p-6">
                      <div>
                        <CardTitle className="line-clamp-2 text-xl text-[#24183d]">{event.title}</CardTitle>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#655c84]">{event.description}</p>
                      </div>

                      <div className="space-y-3 text-sm text-[#5e567a]">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-full bg-[#f3ecff] p-2 text-[#5b34d6]">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-[#24183d]">{startsAt.toLocaleString()}</div>
                            <div className="text-xs text-[#8a80ac]">
                              {event.isCancelled ? "Needs communication follow-up" : startsAt.getTime() > Date.now() ? "Upcoming" : "Completed"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-full bg-[#eef6ff] p-2 text-[#3565cf]">
                            <MapPin className="h-4 w-4" />
                          </div>
                          <div className="truncate">
                            <div className="truncate font-medium text-[#24183d]">{event.location}</div>
                            <div className="text-xs text-[#8a80ac]">Location</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-full bg-[#fff4db] p-2 text-[#c07b12]">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-[#24183d]">{attendanceLabel} attendees</div>
                            <div className="text-xs text-[#8a80ac]">
                              {event.maxAttendees ? `Capacity ${(Math.round(((event.attendeesCount ?? 0) / event.maxAttendees) * 100) || 0)}%` : "Open attendance"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 rounded-full border-[#d9cdfd] text-[#4d36c8] hover:bg-[#f6f1ff]"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedId(event.id)
                          }}
                        >
                          Open details
                        </Button>
                        <Button asChild className="rounded-full bg-[#5b34d6] px-4 hover:bg-[#4a27bf]" onClick={(e) => e.stopPropagation()}>
                          <Link href="/events">
                            Studio
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {selected ? (
        <div
          className="fixed inset-0 z-[4000] flex items-start justify-center overflow-y-auto bg-black/50 p-2 sm:items-center sm:p-4"
          onClick={() => setSelectedId(null)}
        >
          <div className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <EventModal event={selected} onClose={() => setSelectedId(null)} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ManageMetric({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string
  value: number
  description: string
  icon: typeof Calendar
}) {
  return (
    <div className="rounded-[20px] border border-white/80 bg-white/80 p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#8a7eb6]">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-[#24183d]">{value}</div>
      <p className="mt-1 text-sm text-[#665d87]">{description}</p>
    </div>
  )
}
