"use client"

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { DM_Sans, DM_Serif_Display } from "next/font/google"
import {
  ArrowRight,
  CalendarDays,
  Compass,
  Flame,
  Heart,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Users,
} from "lucide-react"

import { AppImage } from "@/components/ui/app-image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { publicGlassCardClass, publicPillClass, publicSoftPanelClass } from "@/components/public-page-shell"
import { useAuth } from "@/context/auth-context"
import { useEvents } from "@/context/events-context"
import { EVENT_CATEGORY_FILTER_OPTIONS, getEventCategoryColor } from "@/lib/event-categories"
import { cn, getLocationString } from "@/lib/utils"
import type { EventModalProps } from "@/components/event-modal"
import type { Event } from "@/types/event"

const InteractiveMap = dynamic(() => import("@/components/interactive-map"), { ssr: false })
const EventModal = dynamic<EventModalProps>(() => import("@/components/event-modal"), { ssr: false })

const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"] })
const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: ["400"] })

type SortOption = "date" | "popularity" | "price"
type QuickFilter = "all" | "for-you" | "free" | "weekend" | "popular"

const quickFilterOptions: Array<{ id: QuickFilter; label: string }> = [
  { id: "all", label: "All upcoming" },
  { id: "for-you", label: "For you" },
  { id: "free", label: "Free" },
  { id: "weekend", label: "This weekend" },
  { id: "popular", label: "Popular" },
]

const swissCityKeywords = [
  "zurich",
  "geneva",
  "basel",
  "bern",
  "lausanne",
  "winterthur",
  "lucerne",
  "zug",
  "lugano",
  "st. gallen",
  "st gallen",
  "fribourg",
  "aarau",
  "thun",
  "biel",
  "neuchatel",
  "chur",
]

const dateFormatter = new Intl.DateTimeFormat("en-CH", { weekday: "short", day: "numeric", month: "short" })
const shortDateFormatter = new Intl.DateTimeFormat("en-CH", { day: "numeric", month: "short" })
const timeFormatter = new Intl.DateTimeFormat("en-CH", { hour: "2-digit", minute: "2-digit" })

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, updateUser } = useAuth()
  const { events, isLoading: eventsLoading } = useEvents()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState<SortOption>("date")
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all")
  const [showEventModal, setShowEventModal] = useState<Event | null>(null)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [detectError, setDetectError] = useState<string | null>(null)
  const didAttemptLocation = useRef(false)
  const deferredSearchTerm = useDeferredValue(searchTerm)

  const userInterests = useMemo(
    () =>
      Array.isArray(user?.interests)
        ? user.interests
            .map((interest) => (typeof interest === "string" ? interest.trim().toLowerCase() : ""))
            .filter((interest) => interest.length > 0)
        : [],
    [user?.interests],
  )

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/")
    }
  }, [authLoading, router, user])

  useEffect(() => {
    if (authLoading || !user || user.location || didAttemptLocation.current) return

    didAttemptLocation.current = true
    setDetectingLocation(true)
    setDetectError(null)

    if (typeof window === "undefined" || !navigator.geolocation) {
      setDetectingLocation(false)
      setDetectError("Location services are not available on this device.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(`/api/location/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}`, {
            cache: "no-store",
          })
          const data = await response.json().catch(() => null)
          if (!response.ok) throw new Error(data?.error || "Could not detect location")
          const location = data?.location || data?.city
          if (!location) throw new Error("No location data returned")
          await updateUser({ location })
        } catch (error) {
          setDetectError(error instanceof Error ? error.message : "Failed to detect location")
        } finally {
          setDetectingLocation(false)
        }
      },
      (error) => {
        setDetectError(error?.message || "Location access is off on this device.")
        setDetectingLocation(false)
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    )
  }, [authLoading, updateUser, user])

  const filteredEvents = useMemo(() => {
    const normalizedSearch = deferredSearchTerm.trim().toLowerCase()

    return [...events]
      .filter((event) => {
        const haystack = `${event.title} ${event.description} ${getLocationString(event.location)} ${event.organizerName ?? ""}`.toLowerCase()
        const matchesSearch = normalizedSearch.length === 0 || haystack.includes(normalizedSearch)
        const matchesCategory = selectedCategory === "all" || event.category === selectedCategory
        if (!matchesSearch || !matchesCategory) return false

        switch (quickFilter) {
          case "for-you":
            return eventMatchesInterest(event, userInterests)
          case "free":
            return (event.price ?? 0) === 0
          case "weekend":
            return isWeekendEvent(event)
          case "popular":
            return (event.attendeesCount ?? 0) >= 12
          default:
            return true
        }
      })
      .sort((a, b) => compareEvents(a, b, sortBy, userInterests))
  }, [deferredSearchTerm, events, quickFilter, selectedCategory, sortBy, userInterests])

  const allUpcomingEvents = useMemo(
    () => [...events].sort((a, b) => compareEvents(a, b, "date", userInterests)),
    [events, userInterests],
  )

  const userPlanEvents = useMemo(
    () => allUpcomingEvents.filter((event) => isPlannedEvent(event)).slice(0, 4),
    [allUpcomingEvents],
  )

  const spotlightEvent = useMemo(() => {
    const plannedIds = new Set(userPlanEvents.map((event) => event.id))
    const recommendation = filteredEvents.find(
      (event) => !plannedIds.has(event.id) && eventMatchesInterest(event, userInterests),
    )
    return recommendation ?? filteredEvents.find((event) => !plannedIds.has(event.id)) ?? filteredEvents[0] ?? null
  }, [filteredEvents, userInterests, userPlanEvents])

  const startingSoonEvents = useMemo(() => filteredEvents.slice(0, 4), [filteredEvents])
  const matchingEvents = useMemo(
    () => filteredEvents.filter((event) => eventMatchesInterest(event, userInterests)).length,
    [filteredEvents, userInterests],
  )

  if (authLoading || !user || eventsLoading) {
    return (
      <div className="h-full min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_top_left,#f4efff,transparent_24%),radial-gradient(circle_at_bottom_right,#eef8ff,transparent_28%),linear-gradient(180deg,#ffffff,#faf7ff)]">
        <div className="mx-auto w-full max-w-[1280px] animate-pulse px-4 pb-14 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-20">
          <div className={`${publicGlassCardClass} space-y-6 px-5 py-6 sm:px-7 lg:px-10 lg:py-9`}>
            <div className="h-4 w-24 rounded-full bg-[#ede6ff]" />
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_400px]">
              <div className="space-y-4">
                <div className="h-16 max-w-3xl rounded-[24px] bg-[#f2edff]" />
                <div className="h-6 max-w-2xl rounded-full bg-[#f6f1ff]" />
                <div className="flex flex-wrap gap-3">
                  <div className="h-11 w-72 rounded-full bg-[#f6f1ff]" />
                  <div className="h-11 w-72 rounded-full bg-[#f6f1ff]" />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-40 rounded-[26px] bg-[#fbf9ff]" />
                  ))}
                </div>
              </div>
              <div className="h-[420px] rounded-[28px] bg-[#fbf9ff]" />
            </div>
          </div>

          <div className={`${publicSoftPanelClass} mt-8 p-5`}>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_220px]">
              <div className="h-12 rounded-full bg-[#fbf9ff]" />
              <div className="h-12 rounded-full bg-[#fbf9ff]" />
              <div className="h-12 rounded-full bg-[#fbf9ff]" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-10 w-28 rounded-full bg-[#fbf9ff]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const firstName = user.name?.trim().split(/\s+/)[0] || "there"
  const isOrganizer = user.role === "ORGANIZER"
  const locationLabel = getDiscoverLocationLabel(user.location)
  const detectNotice = detectingLocation
    ? "Checking your location so the discovery feed feels more local."
    : detectError
      ? "Location is off right now, so this view stays on the wider Swiss feed."
      : user.location
        ? `Showing the strongest upcoming options around ${locationLabel}.`
        : "Use the filters below to narrow the strongest upcoming plans."
  const summaryChips = [
    {
      label: "Matching now",
      value: filteredEvents.length,
      icon: Compass,
    },
    {
      label: "Your plans",
      value: userPlanEvents.length,
      icon: Heart,
    },
    {
      label: "For your interests",
      value: matchingEvents,
      icon: Sparkles,
    },
  ]
  const feedSummary =
    user.location && locationLabel !== "your wider area"
      ? `${filteredEvents.length} events match this view around ${locationLabel}.`
      : `${filteredEvents.length} events match this view right now.`

  return (
    <div className={cn(dmSans.className, "h-full min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_top_left,#f4efff,transparent_24%),radial-gradient(circle_at_bottom_right,#eef8ff,transparent_28%),linear-gradient(180deg,#ffffff,#faf7ff)]")}>
      <div className="mx-auto w-full max-w-[1280px] px-4 pb-14 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-20">
        <section className={`${publicGlassCardClass} relative overflow-hidden px-5 py-6 sm:px-7 lg:px-8`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,rgba(124,92,255,0.18),transparent_52%),radial-gradient(circle_at_top_right,rgba(101,213,255,0.12),transparent_42%)]" />
          <div className="relative space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#887ab8]">Discover</p>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-4xl">
                  <h1 className={cn(dmSerif.className, "text-4xl leading-[1.02] tracking-[-0.04em] text-[#24154b] sm:text-5xl lg:text-[4rem]")}>
                    Start with the plans that already feel worth opening.
                  </h1>
                  <p className="mt-4 max-w-2xl text-[17px] leading-8 text-[#6a5f8f] sm:text-lg">
                    Welcome back, {firstName}. Search quickly, skim what fits, and keep the good options close without digging through clutter.
                  </p>
                </div>
                <div className={cn(publicPillClass, "self-start border-[#e8dcff] bg-white/92 text-[#6a5f8f]")}>
                  <MapPin className="h-4 w-4 text-[#7c5cff]" />
                  <span>{detectNotice}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {summaryChips.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="inline-flex min-w-[160px] items-center gap-3 rounded-full border border-[#ece4ff] bg-white/94 px-4 py-3 shadow-[0_10px_24px_rgba(101,73,214,0.05)]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5efff] text-[#7c5cff]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a8fc2]">{label}</p>
                    <p className="text-base font-semibold text-[#24154b]">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className={`${publicSoftPanelClass} p-4 sm:p-5`}>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a8fc2]" />
                  <Input
                    placeholder="Search events, locations, organizers..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="h-12 rounded-full border-[#e7defe] bg-white/96 pl-11 text-[#24154b] placeholder:text-[#9a8fc2]"
                  />
                </div>

                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-12 rounded-full border-[#e7defe] bg-white/96 px-4 text-[#24154b]">
                    <div className="flex items-center gap-2 text-[#5d5184]">
                      <Compass className="h-4 w-4" />
                      <SelectValue placeholder="All categories" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_CATEGORY_FILTER_OPTIONS.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        <span className="flex items-center">
                          <span className={`mr-2 inline-block h-3 w-3 rounded-full ${category.color}`} />
                          {category.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger className="h-12 rounded-full border-[#e7defe] bg-white/96 px-4 text-[#24154b]">
                    <div className="flex items-center gap-2 text-[#5d5184]">
                      <Flame className="h-4 w-4" />
                      <SelectValue placeholder="Sort by" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Soonest first</SelectItem>
                    <SelectItem value="popularity">Most popular</SelectItem>
                    <SelectItem value="price">Lowest price</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {quickFilterOptions.map((option) => {
                  const active = quickFilter === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setQuickFilter(option.id)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                        active
                          ? "border-[#cdbdff] bg-[#f5efff] text-[#4f33d8] shadow-[0_10px_22px_rgba(124,92,255,0.12)]"
                          : "border-[#ece4ff] bg-white text-[#6a5f8f] hover:border-[#d9cbff] hover:text-[#4f33d8]",
                      )}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className={`${publicSoftPanelClass} order-2 p-5 sm:p-6 xl:order-none`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#887ab8]">Your plans</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#24154b]">
                  {userPlanEvents.length > 0 ? "The ones you already care about." : "Nothing is saved yet."}
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-[#6a5f8f]">
                {userPlanEvents.length > 0
                  ? "Saved and RSVP'd events should stay easy to reach, especially when you only have a few seconds."
                  : "When something feels worth keeping, save it or RSVP once and it will stay near the top here."}
              </p>
            </div>

            {userPlanEvents.length > 0 ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {userPlanEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setShowEventModal(event)}
                    className="overflow-hidden rounded-[26px] border border-[#efe8ff] bg-white text-left shadow-[0_14px_30px_rgba(101,73,214,0.05)] transition-all hover:-translate-y-1 hover:border-[#dbceff] hover:shadow-[0_22px_42px_rgba(101,73,214,0.1)]"
                  >
                    <div className="relative aspect-[1.55/1] bg-[#f7f3ff]">
                      <AppImage src={event.imageUrl} alt={event.title} fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(23,10,54,0.68)] via-transparent to-transparent" />
                      <div className="absolute left-4 right-4 top-4 flex flex-wrap gap-2">
                        <Badge className="rounded-full bg-white/92 px-3 py-1 text-[#24154b] shadow-none">
                          {event.rsvpStatus === "GOING" ? "Going" : event.rsvpStatus === "MAYBE" ? "Maybe" : "Saved"}
                        </Badge>
                        {event.price === 0 ? <Badge className="rounded-full bg-[#eaf9ef] px-3 py-1 text-[#177245] shadow-none">Free</Badge> : null}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
                        <p className="line-clamp-2 text-xl font-semibold leading-tight tracking-[-0.03em] text-white">{event.title}</p>
                      </div>
                    </div>

                    <div className="space-y-3 p-5">
                      <div className="flex items-start gap-2 text-sm text-[#5d5184]">
                        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#7c5cff]" />
                        <div>
                          <p className="font-medium text-[#24154b]">{formatEventDateLabel(event)}</p>
                          <p className="text-[#6a5f8f]">{formatEventTimeLabel(event)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-[#5d5184]">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#7c5cff]" />
                        <div>
                          <p className="font-medium text-[#24154b]">{event.city || "Switzerland"}</p>
                          <p className="line-clamp-1 text-[#6a5f8f]">{getLocationString(event.location)}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[26px] border border-[#efe8ff] bg-white px-5 py-5">
                <p className="text-sm font-semibold text-[#24154b]">The next step is simple.</p>
                <p className="mt-2 text-sm leading-7 text-[#6a5f8f]">
                  Open a card when an event feels right, then save it or RSVP from the drawer so it stays one tap away later.
                </p>
              </div>
            )}
          </div>

          <aside className={`${publicSoftPanelClass} order-1 p-5 sm:p-6 xl:order-none`}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#887ab8]">Worth opening first</p>
            {spotlightEvent ? (
              <div className="mt-4 space-y-4">
                <div className="relative overflow-hidden rounded-[28px] border border-[#eee6ff] bg-[#f7f3ff]">
                  <div className="relative aspect-[1.16/1]">
                    <AppImage
                      src={spotlightEvent.imageUrl}
                      alt={spotlightEvent.title}
                      fill
                      sizes="(min-width: 1280px) 360px, 100vw"
                      className="object-cover"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[rgba(22,10,54,0.72)] via-transparent to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge className="rounded-full bg-white/92 px-3 py-1 text-[#24154b] shadow-none">
                          {formatRelativeEventLabel(spotlightEvent)}
                        </Badge>
                        {spotlightEvent.isBoosted ? (
                          <Badge className="rounded-full bg-[#f8f2ff] px-3 py-1 text-[#5f43e5] shadow-none">Featured</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#24154b]">{spotlightEvent.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-[#6a5f8f]">{spotlightEvent.description}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-[#efe8ff] bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#887ab8]">When</p>
                    <p className="mt-2 text-sm font-semibold text-[#24154b]">{formatEventDateLabel(spotlightEvent)}</p>
                    <p className="mt-1 text-sm text-[#6a5f8f]">{formatEventTimeLabel(spotlightEvent)}</p>
                  </div>
                  <div className="rounded-[22px] border border-[#efe8ff] bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#887ab8]">Hosted by</p>
                    <p className="mt-2 text-sm font-semibold text-[#24154b]">{spotlightEvent.organizerName || "Viao host"}</p>
                    <p className="mt-1 text-sm text-[#6a5f8f]">{spotlightEvent.city || getLocationString(spotlightEvent.location)}</p>
                  </div>
                </div>

                <Button
                  onClick={() => setShowEventModal(spotlightEvent)}
                  className="h-11 w-full rounded-full bg-[#7c5cff] text-white shadow-[0_14px_28px_rgba(124,92,255,0.24)] hover:bg-[#6c4ef7]"
                >
                  Open event
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="mt-4 rounded-[24px] border border-[#efe8ff] bg-white px-5 py-6">
                <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[#24154b]">No strong match yet.</h3>
                <p className="mt-3 text-sm leading-7 text-[#6a5f8f]">
                  Clear a filter or switch to a broader search and the next strong option will show here.
                </p>
              </div>
            )}
          </aside>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#887ab8]">Event feed</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#24154b]">Open the ones that already feel right.</h2>
            </div>
            <p className="text-sm leading-7 text-[#6a5f8f]">{feedSummary}</p>
          </div>

          {filteredEvents.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {filteredEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setShowEventModal(event)}
                  className={`${publicSoftPanelClass} group flex w-full flex-col overflow-hidden p-0 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_28px_56px_rgba(101,73,214,0.12)]`}
                >
                  <div className="relative aspect-[1.35/1] overflow-hidden">
                    <AppImage
                      src={event.imageUrl}
                      alt={event.title}
                      fill
                      sizes="(min-width: 1536px) 28vw, (min-width: 768px) 48vw, 100vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[rgba(23,10,54,0.68)] via-transparent to-transparent" />
                    <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
                      <Badge className="rounded-full bg-white/92 px-3 py-1 text-[#24154b] shadow-none">
                        <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${getEventCategoryColor(event.category)}`} />
                        {event.category}
                      </Badge>
                      <div className="flex flex-wrap justify-end gap-2">
                        {event.price === 0 ? <Badge className="rounded-full bg-[#eaf9ef] px-3 py-1 text-[#177245] shadow-none">Free</Badge> : null}
                        {event.isSaved ? <Badge className="rounded-full bg-[#fff4f7] px-3 py-1 text-[#b13053] shadow-none">Saved</Badge> : null}
                        {event.rsvpStatus === "GOING" ? <Badge className="rounded-full bg-[#eef9ff] px-3 py-1 text-[#1d6da3] shadow-none">Going</Badge> : null}
                        {event.isBoosted ? <Badge className="rounded-full bg-[#f6f1ff] px-3 py-1 text-[#5f43e5] shadow-none">Featured</Badge> : null}
                      </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
                      <p className="line-clamp-2 text-xl font-semibold leading-tight tracking-[-0.03em] text-white">{event.title}</p>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="space-y-3">
                      <p className="line-clamp-2 text-sm leading-7 text-[#6a5f8f]">{event.description}</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="flex items-start gap-2 text-sm text-[#5d5184]">
                          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#7c5cff]" />
                          <div>
                            <p className="font-medium text-[#24154b]">{formatEventDateLabel(event)}</p>
                            <p className="text-[#6a5f8f]">{formatEventTimeLabel(event)}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-[#5d5184]">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#7c5cff]" />
                          <div>
                            <p className="font-medium text-[#24154b]">{event.city || "Switzerland"}</p>
                            <p className="line-clamp-1 text-[#6a5f8f]">{getLocationString(event.location)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-[22px] border border-[#efe8ff] bg-[#fbf9ff] px-4 py-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#887ab8]">Hosted by</p>
                          <p className="mt-1 text-sm font-semibold text-[#24154b]">{event.organizerName || "Viao host"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#887ab8]">Attendance</p>
                          <p className="mt-1 text-sm font-semibold text-[#24154b]">{event.attendeesCount ?? 0}/{event.maxAttendees || "∞"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-[#5d5184]">
                        <Users className="h-4 w-4 text-[#7c5cff]" />
                        <span>{event.attendeesCount ?? 0} interested</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-base font-semibold text-[#24154b]">{event.price === 0 ? "Free" : `CHF ${event.price ?? 0}`}</span>
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#5f43e5]">
                          Open
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className={`${publicSoftPanelClass} p-8 sm:p-10`}>
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#f5f0ff] text-[#7c5cff]">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-[#24154b]">Nothing matches this exact mix yet.</h3>
                <p className="mt-3 text-sm leading-7 text-[#6a5f8f]">
                  Try a different keyword, switch the quick filter, or clear the current choices so the stronger plans can return.
                </p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("")
                      setSelectedCategory("all")
                      setSortBy("date")
                      setQuickFilter("all")
                    }}
                    className="h-11 rounded-full border-[#ddd1ff] bg-white text-[#5e4ea6] hover:bg-[#f6f1ff]"
                  >
                    Clear filters
                  </Button>
                  {isOrganizer ? (
                    <Button
                      onClick={() => router.push("/events")}
                      className="h-11 rounded-full bg-[#7c5cff] text-white shadow-[0_14px_28px_rgba(124,92,255,0.24)] hover:bg-[#6c4ef7]"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create event
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <section className={`${publicSoftPanelClass} overflow-hidden p-0`}>
            <div className="border-b border-[#eee6ff] px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#887ab8]">Map radar</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#24154b]">
                    {user.location ? `Explore around ${locationLabel}` : "Use the map when place matters"}
                  </h2>
                </div>
                <p className="max-w-md text-sm leading-7 text-[#6a5f8f]">
                  The map is here when location matters, but the feed stays the main decision surface.
                </p>
              </div>
            </div>
            <div className="h-[320px] sm:h-[380px]">
              <InteractiveMap events={filteredEvents} onEventClick={(event) => setShowEventModal(event)} />
            </div>
          </section>

          <aside className="space-y-5">
            <section className={`${publicSoftPanelClass} p-5 sm:p-6`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#887ab8]">Starting soon</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#24154b]">Quick next options</h2>
                </div>
                <Badge className="rounded-full bg-[#f6f1ff] px-3 py-1 text-[#5f43e5] shadow-none">{startingSoonEvents.length}</Badge>
              </div>

              <div className="mt-5 space-y-3">
                {startingSoonEvents.length > 0 ? (
                  startingSoonEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setShowEventModal(event)}
                      className="w-full rounded-[24px] border border-[#efe8ff] bg-white px-3 py-3 text-left shadow-[0_10px_24px_rgba(101,73,214,0.05)] transition-all hover:-translate-y-0.5 hover:border-[#d8cbff] hover:shadow-[0_16px_34px_rgba(101,73,214,0.1)]"
                    >
                      <div className="flex gap-3">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[18px] bg-[#f7f3ff]">
                          <AppImage src={event.imageUrl} alt={event.title} fill sizes="64px" className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="rounded-full bg-[#f6f1ff] px-2.5 py-1 text-[#5f43e5] shadow-none">
                              {event.category}
                            </Badge>
                            <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#9a8fc2]">{formatRelativeEventLabel(event)}</span>
                          </div>
                          <p className="mt-2 line-clamp-1 text-sm font-semibold text-[#24154b]">{event.title}</p>
                          <p className="mt-1 line-clamp-1 text-sm text-[#6a5f8f]">
                            {event.city || getLocationString(event.location)} · {event.price === 0 ? "Free" : `CHF ${event.price ?? 0}`}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="rounded-[22px] border border-[#efe8ff] bg-white px-4 py-4 text-sm leading-7 text-[#6a5f8f]">
                    Nothing matches this combination yet. Clear one filter and the stronger options will return.
                  </p>
                )}
              </div>
            </section>

            {isOrganizer ? (
              <section className={`${publicSoftPanelClass} p-5 sm:p-6`}>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#887ab8]">Organizer tools</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#24154b]">Need to publish or boost something new?</h2>
                <p className="mt-3 text-sm leading-7 text-[#6a5f8f]">
                  Create, update, and promote events from the organizer workspace when something deserves more reach.
                </p>
                <Button
                  onClick={() => router.push("/events")}
                  className="mt-5 h-11 rounded-full bg-[#7c5cff] text-white shadow-[0_14px_28px_rgba(124,92,255,0.24)] hover:bg-[#6c4ef7]"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Manage events
                </Button>
              </section>
            ) : null}
          </aside>
        </section>

        {showEventModal ? (
          <div
            className="fixed inset-0 z-[4000] flex items-start justify-center overflow-y-auto bg-black/50 p-2 sm:items-center sm:p-4"
            onClick={() => setShowEventModal(null)}
          >
            <div className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto" onClick={(event) => event.stopPropagation()}>
              <EventModal event={showEventModal} onClose={() => setShowEventModal(null)} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function compareEvents(a: Event, b: Event, sortBy: SortOption, userInterests: string[]) {
  const now = Date.now()
  const aBoostLevel = typeof a.boostLevel === "number" ? a.boostLevel : 0
  const bBoostLevel = typeof b.boostLevel === "number" ? b.boostLevel : 0
  const aIsPremium = aBoostLevel >= 2
  const bIsPremium = bBoostLevel >= 2
  const aIsBoosted = !!a.isBoosted || aBoostLevel > 0
  const bIsBoosted = !!b.isBoosted || bBoostLevel > 0
  const aFeatured = userInterests.length > 0 && aIsPremium && eventMatchesInterest(a, userInterests)
  const bFeatured = userInterests.length > 0 && bIsPremium && eventMatchesInterest(b, userInterests)

  if (aFeatured !== bFeatured) return aFeatured ? -1 : 1
  if (aIsPremium !== bIsPremium) return aIsPremium ? -1 : 1
  if (aIsBoosted !== bIsBoosted) return aIsBoosted ? -1 : 1

  const aTimeLeft = getEventTimestamp(a) - now
  const bTimeLeft = getEventTimestamp(b) - now

  switch (sortBy) {
    case "date":
      return aTimeLeft - bTimeLeft
    case "popularity":
      return (b.attendeesCount ?? 0) - (a.attendeesCount ?? 0)
    case "price":
      return (a.price ?? 0) - (b.price ?? 0)
    default:
      return 0
  }
}

function eventMatchesInterest(event: Event, userInterests: string[]) {
  if (userInterests.length === 0) return false
  const haystack = `${event.category} ${event.title} ${event.description}`.toLowerCase()
  return userInterests.some((interest) => haystack.includes(interest))
}

function isWeekendEvent(event: Event) {
  const day = new Date(event.startsAt ?? event.date).getDay()
  return day === 5 || day === 6 || day === 0
}

function getEventTimestamp(event: Event) {
  const timestamp = new Date(event.startsAt ?? event.date).getTime()
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp
}

function formatEventDateLabel(event: Event) {
  return dateFormatter.format(new Date(event.startsAt ?? event.date))
}

function formatEventTimeLabel(event: Event) {
  if (event.time?.trim()) return event.time
  const date = new Date(event.startsAt ?? event.date)
  return Number.isNaN(date.getTime()) ? "Time TBC" : timeFormatter.format(date)
}

function formatRelativeEventLabel(event: Event) {
  const date = new Date(event.startsAt ?? event.date)
  if (Number.isNaN(date.getTime())) return "Coming up"

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000)

  if (days <= 0) return "Today"
  if (days === 1) return "Tomorrow"
  if (days < 7) return `${days} days away`
  return shortDateFormatter.format(date)
}

function isPlannedEvent(event: Event) {
  return Boolean(event.isSaved || event.rsvpStatus === "GOING" || event.rsvpStatus === "MAYBE")
}

function getDiscoverLocationLabel(location?: string | null) {
  const value = location?.trim()
  if (!value) return "the Swiss feed"

  const normalized = value.toLowerCase()
  if (swissCityKeywords.some((keyword) => normalized.includes(keyword))) {
    return value
  }

  return "your wider area"
}
