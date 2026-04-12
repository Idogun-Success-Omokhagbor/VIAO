"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AppImage } from "@/components/ui/app-image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bookmark, Calendar, CheckCircle2, Clock3, Compass, ArrowRight, MapPin, Sparkles } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { getEventCategoryColor } from "@/lib/event-categories"
import { getErrorMessage, readJsonOrNull } from "@/lib/http"
import { getLocationString } from "@/lib/utils"
import type { Event } from "@/types/event"

type MyEventsTab = "rsvp" | "saved"

async function fetchMyEvents(path: "/api/events/me/rsvps" | "/api/events/me/saved") {
  const res = await fetch(path, { cache: "no-store", credentials: "include" })
  const data = await readJsonOrNull<{ events?: Event[]; error?: string }>(res)
  if (!res.ok) throw new Error(getErrorMessage(data, "Failed to load events"))
  return Array.isArray(data?.events) ? data.events : []
}

function isMyEventsTab(value: string | null): value is MyEventsTab {
  return value === "rsvp" || value === "saved"
}

function getEventTimestamp(event: Event) {
  return new Date(event.startsAt ?? event.date).getTime()
}

export default function MyEventsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()

  const queryTab = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<MyEventsTab>(isMyEventsTab(queryTab) ? queryTab : "rsvp")
  const [rsvpEvents, setRsvpEvents] = useState<Event[]>([])
  const [savedEvents, setSavedEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const nextTab = isMyEventsTab(queryTab) ? queryTab : "rsvp"
    setActiveTab((current) => (current === nextTab ? current : nextTab))
  }, [queryTab])

  useEffect(() => {
    if (authLoading) return
    if (!user) router.replace("/")
  }, [authLoading, router, user])

  useEffect(() => {
    if (authLoading || !user) return

    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([fetchMyEvents("/api/events/me/rsvps"), fetchMyEvents("/api/events/me/saved")])
      .then(([rsvps, saved]) => {
        if (cancelled) return
        setRsvpEvents(rsvps)
        setSavedEvents(saved)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load your events")
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authLoading, user])

  const tabEvents = useMemo(() => {
    return activeTab === "rsvp" ? rsvpEvents : savedEvents
  }, [activeTab, rsvpEvents, savedEvents])

  const summary = useMemo(() => {
    const deduped = Array.from(new Map([...rsvpEvents, ...savedEvents].map((event) => [event.id, event])).values())
    const now = Date.now()
    const upcomingCount = deduped.filter((event) => getEventTimestamp(event) >= now).length
    const thisMonthCount = deduped.filter((event) => {
      const eventDate = new Date(event.startsAt ?? event.date)
      const current = new Date()
      return eventDate.getFullYear() === current.getFullYear() && eventDate.getMonth() === current.getMonth()
    }).length

    return {
      trackedCount: deduped.length,
      upcomingCount,
      thisMonthCount,
      savedCount: savedEvents.length,
      rsvpCount: rsvpEvents.length,
    }
  }, [rsvpEvents, savedEvents])

  if (authLoading || !user) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  const handleTabChange = (value: string) => {
    if (!isMyEventsTab(value)) return
    setActiveTab(value)

    const params = new URLSearchParams(searchParams.toString())
    if (value === "rsvp") {
      params.delete("tab")
    } else {
      params.set("tab", value)
    }

    const next = params.toString()
    router.replace(next ? `/my-events?${next}` : "/my-events", { scroll: false })
  }

  const openEventDetails = (eventId: string) => {
    router.push(`/events/${eventId}?from=plans`)
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-[#fcfaff]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-[#eadfff] bg-[linear-gradient(135deg,#fff_0%,#f8f4ff_56%,#edf7ff_100%)] shadow-[0_24px_60px_rgba(98,59,188,0.08)]">
          <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Badge className="mb-4 rounded-full bg-white/90 px-3 py-1 text-[#5f49be] hover:bg-white">Plans you care about</Badge>
              <h1 className="text-3xl font-semibold tracking-tight text-[#1f1538] sm:text-4xl">Your Plans</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5f5679] sm:text-base">
                Keep confirmed plans and saved ideas in one place so the next thing you meant to attend never gets buried.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-11 rounded-full bg-[#5b34d6] px-5 shadow-[0_16px_30px_rgba(91,52,214,0.25)] hover:bg-[#4a27bf]">
                <Link href="/discover">
                  <Compass className="mr-2 h-4 w-4" />
                  Discover more
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-full border-white/70 bg-white/75 px-5 text-[#4c3a95] hover:bg-white">
                <Link href="/account">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Tune my profile
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 border-t border-white/70 bg-white/55 p-4 sm:grid-cols-4 sm:p-6">
            <SummaryCard icon={CheckCircle2} label="RSVP'd" value={summary.rsvpCount} description="Confirmed or responded plans" />
            <SummaryCard icon={Bookmark} label="Saved" value={summary.savedCount} description="Ideas you kept for later" />
            <SummaryCard icon={Clock3} label="Upcoming" value={summary.upcomingCount} description="Tracked events still ahead of you" />
            <SummaryCard icon={Calendar} label="This month" value={summary.thisMonthCount} description="Events landing this month" />
          </div>
        </section>

        {error ? (
          <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <section className="rounded-[24px] border border-[#ece4ff] bg-white p-4 shadow-[0_16px_40px_rgba(98,59,188,0.06)] sm:p-5">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#24183d]">Stay close to what feels real.</h2>
                <p className="mt-1 text-sm text-[#6b628d]">
                  {activeTab === "rsvp"
                    ? "Everything you've committed to or answered, so the next move stays obvious."
                    : "Ideas worth revisiting before they disappear into the noise."}
                </p>
              </div>

              <TabsList className="grid h-auto w-full max-w-md grid-cols-2 rounded-full bg-[#f5efff] p-1">
                <TabsTrigger value="rsvp" className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-[#4e35cc]">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  RSVP
                  <Badge variant="secondary" className="ml-2 rounded-full bg-[#ede6ff] text-[#4e35cc] hover:bg-[#ede6ff]">
                    {rsvpEvents.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="saved" className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-[#4e35cc]">
                  <Bookmark className="mr-2 h-4 w-4" />
                  Saved
                  <Badge variant="secondary" className="ml-2 rounded-full bg-[#ede6ff] text-[#4e35cc] hover:bg-[#ede6ff]">
                    {savedEvents.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="rsvp" className="mt-6">
              {loading ? (
                <LoadingState label="Loading your RSVP events..." />
              ) : tabEvents.length === 0 ? (
                <EmptyMyEventsState
                  title="No RSVP plans yet"
                  description="Once you commit to something, VIAO should make it easy to pick back up."
                />
              ) : (
                <EventGrid events={tabEvents} kind="rsvp" onOpen={openEventDetails} />
              )}
            </TabsContent>

            <TabsContent value="saved" className="mt-6">
              {loading ? (
                <LoadingState label="Loading your saved events..." />
              ) : tabEvents.length === 0 ? (
                <EmptyMyEventsState
                  title="Nothing saved yet"
                  description="Save anything with potential so you can come back when the timing feels right."
                />
              ) : (
                <EventGrid events={tabEvents} kind="saved" onOpen={openEventDetails} />
              )}
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof Calendar
  label: string
  value: number
  description: string
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

function LoadingState({ label }: { label: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-[#ddd1ff] px-6 py-16 text-center text-sm text-[#6b628d]">
      {label}
    </div>
  )
}

function EmptyMyEventsState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="rounded-[24px] border-dashed border-[#d9cdfd] bg-[#fcfbff] shadow-none">
      <CardContent className="px-6 py-14 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f3ecff] text-[#5b34d6]">
          <Calendar className="h-7 w-7" />
        </div>
        <h3 className="mt-5 text-xl font-semibold text-[#24183d]">{title}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#685f88]">{description}</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild className="rounded-full bg-[#5b34d6] hover:bg-[#4a27bf]">
            <Link href="/discover">Find something worth going to</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-[#d9cdfd]">
            <Link href="/account">Tune my profile</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function EventGrid({
  events,
  kind,
  onOpen,
}: {
  events: Event[]
  kind: MyEventsTab
  onOpen: (eventId: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {events.map((event) => {
        const categoryColor = getEventCategoryColor(event.category)
        const image = (event.imageUrls && event.imageUrls.length > 0 ? event.imageUrls[0] : event.imageUrl) || "/placeholder.svg"
        const startsAt = new Date(event.startsAt ?? event.date)
        const isUpcoming = startsAt.getTime() >= Date.now()
        const primaryStatus =
          kind === "rsvp"
            ? event.rsvpStatus === "MAYBE"
              ? "Maybe"
              : event.rsvpStatus === "NOT_GOING"
                ? "Not going"
                : "Going"
            : "Saved"

        return (
          <Card
            key={event.id}
            className="group overflow-hidden rounded-[24px] border border-[#ece4ff] bg-white/95 shadow-[0_16px_36px_rgba(76,53,160,0.07)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_22px_44px_rgba(76,53,160,0.12)]"
            onClick={() => onOpen(event.id)}
          >
            <div className="relative">
              <AppImage
                src={image}
                alt={event.title}
                width={800}
                height={352}
                sizes="(min-width: 1280px) 30vw, (min-width: 640px) 50vw, 100vw"
                className="h-48 w-full object-cover"
              />
              <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
                <Badge variant="secondary" className="rounded-full bg-white/90 text-gray-800 hover:bg-white">
                  <span className={`mr-2 inline-block h-3 w-3 rounded-full ${categoryColor}`} />
                  {event.category}
                </Badge>
                <Badge className="rounded-full bg-[#5b34d6] hover:bg-[#5b34d6]">{primaryStatus}</Badge>
              </div>
              <div className="absolute bottom-3 left-3">
                <Badge variant="secondary" className="rounded-full bg-black/70 text-white hover:bg-black/70">
                  {isUpcoming ? "Upcoming" : "Past"}
                </Badge>
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
                    <div className="text-xs text-[#8a80ac]">{isUpcoming ? "Coming up soon" : "Already happened"}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-[#eef6ff] p-2 text-[#3565cf]">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="truncate">
                    <div className="truncate font-medium text-[#24183d]">{getLocationString(event.location)}</div>
                    <div className="text-xs text-[#8a80ac]">Location</div>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full border-[#d9cdfd] text-[#4d36c8] hover:bg-[#f6f1ff]"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpen(event.id)
                }}
              >
                View details
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
