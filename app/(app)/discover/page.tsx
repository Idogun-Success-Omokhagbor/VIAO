"use client"

import { useDeferredValue, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DM_Sans, DM_Serif_Display } from "next/font/google"
import { ArrowRight, CalendarDays, Compass, MapPin, RotateCcw, Search, Sparkles } from "lucide-react"

import EventQuickActions from "@/components/event-quick-actions"
import { publicGlassCardClass, publicPillClass, publicSoftPanelClass } from "@/components/public-page-shell"
import { AppImage } from "@/components/ui/app-image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/context/auth-context"
import { useEvents } from "@/context/events-context"
import { useDismissedEvents } from "@/hooks/use-dismissed-events"
import { EVENT_CATEGORY_FILTER_OPTIONS, getEventCategoryColor } from "@/lib/event-categories"
import {
  compareExploreEvents,
  eventMatchesInterest,
  eventMatchesLocation,
  formatEventDateLabel,
  formatEventTimeLabel,
  formatRelativeEventLabel,
  getDiscoverLocationLabel,
  getRecommendationReason,
  isPlannedEvent,
  isUpcomingEvent,
  quickFilterOptions,
  type QuickFilter,
  type SortOption,
} from "@/lib/event-discovery"
import { cn, getLocationString } from "@/lib/utils"

const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"] })
const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: ["400"] })

const DEFAULT_VISIBLE_COUNT = 8
const REVEAL_DELAYS = ["", "viao-delay-1", "viao-delay-2", "viao-delay-3", "viao-delay-4"] as const

const sortLabels: Record<SortOption, string> = {
  recommended: "Best fit first",
  date: "Soonest first",
  popularity: "Most popular",
  price: "Lowest price",
}

function getRevealDelay(index: number) {
  return REVEAL_DELAYS[index % REVEAL_DELAYS.length]
}

export default function DiscoverPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { events, isLoading: eventsLoading } = useEvents()
  const { dismissedIds, dismissedSet, dismissEvent, clearDismissedEvents } = useDismissedEvents(user?.id)

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState<SortOption>("recommended")
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("for-you")
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE_COUNT)
  const deferredSearchTerm = useDeferredValue(searchTerm)

  const userInterests = useMemo(
    () =>
      Array.isArray(user?.interests)
        ? user.interests
            .map((interest) => (typeof interest === "string" ? interest.trim() : ""))
            .filter((interest) => interest.length > 0)
        : [],
    [user?.interests],
  )

  const normalizedUserInterests = useMemo(
    () => userInterests.map((interest) => interest.toLowerCase()),
    [userInterests],
  )

  const userLocation = user?.location?.trim() ?? ""
  const locationLabel = getDiscoverLocationLabel(userLocation)
  const normalizedSearchTerm = deferredSearchTerm.trim().toLowerCase()

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/")
    }
  }, [authLoading, router, user])

  const upcomingEvents = useMemo(
    () =>
      events
        .filter(isUpcomingEvent)
        .filter((event) => !dismissedSet.has(event.id) || isPlannedEvent(event)),
    [dismissedSet, events],
  )

  const filteredEvents = useMemo(() => {
    return upcomingEvents
      .filter((event) => {
        const haystack =
          `${event.title} ${event.description} ${getLocationString(event.location)} ${event.organizerName ?? ""}`.toLowerCase()
        const matchesSearch = normalizedSearchTerm.length === 0 || haystack.includes(normalizedSearchTerm)
        const matchesCategory = selectedCategory === "all" || event.category === selectedCategory

        if (!matchesSearch || !matchesCategory) return false

        switch (quickFilter) {
          case "for-you":
            if (normalizedUserInterests.length > 0) return eventMatchesInterest(event, normalizedUserInterests)
            if (userLocation) return eventMatchesLocation(event, userLocation)
            return true
          case "nearby":
            return userLocation ? eventMatchesLocation(event, userLocation) : true
          case "free":
            return (event.price ?? 0) === 0
          case "weekend": {
            const day = new Date(event.startsAt ?? event.date).getDay()
            return day === 5 || day === 6 || day === 0
          }
          case "popular":
            return (event.attendeesCount ?? 0) >= 12
          default:
            return true
        }
      })
      .sort((a, b) => compareExploreEvents(a, b, sortBy, normalizedUserInterests, userLocation))
  }, [normalizedSearchTerm, normalizedUserInterests, quickFilter, selectedCategory, sortBy, upcomingEvents, userLocation])

  useEffect(() => {
    setVisibleCount(DEFAULT_VISIBLE_COUNT)
  }, [normalizedSearchTerm, quickFilter, selectedCategory, sortBy, userLocation, normalizedUserInterests])

  const visibleEvents = filteredEvents.slice(0, visibleCount)
  const hiddenCount = dismissedIds.length
  const nearbyCount = useMemo(
    () => upcomingEvents.filter((event) => eventMatchesLocation(event, userLocation)).length,
    [upcomingEvents, userLocation],
  )
  const interestMatchCount = useMemo(
    () => upcomingEvents.filter((event) => eventMatchesInterest(event, normalizedUserInterests)).length,
    [normalizedUserInterests, upcomingEvents],
  )

  const activeQuickFilter = quickFilterOptions.find((option) => option.id === quickFilter)
  const hasActiveFilters =
    normalizedSearchTerm.length > 0 || selectedCategory !== "all" || sortBy !== "recommended" || quickFilter !== "for-you"

  const resultSummary = useMemo(() => {
    if (normalizedSearchTerm.length > 0) {
      return `Results matching “${deferredSearchTerm.trim()}” among plans people can join right now.`
    }
    if (quickFilter === "nearby" && userLocation) {
      return `Keeping the mix close to ${locationLabel} first.`
    }
    if (quickFilter === "for-you" && (normalizedUserInterests.length > 0 || userLocation)) {
      return "Leaning on your city, interests, timing, and momentum."
    }
    if (quickFilter === "free") {
      return "Only free plans are left in the mix."
    }
    if (quickFilter === "weekend") {
      return "Only weekend plans are in the mix."
    }
    if (quickFilter === "popular") {
      return "Plans with stronger crowd energy are leading right now."
    }
    return "A broader sweep of plans worth considering."
  }, [deferredSearchTerm, locationLabel, normalizedSearchTerm.length, normalizedUserInterests.length, quickFilter, userLocation])

  function resetFilters() {
    setSearchTerm("")
    setSelectedCategory("all")
    setSortBy("recommended")
    setQuickFilter("for-you")
  }

  function openEventDetails(eventId: string) {
    router.push(`/events/${eventId}?from=discover`)
  }

  if (authLoading || !user || eventsLoading) {
    return (
      <div className="h-full min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_top_left,#f4efff,transparent_24%),radial-gradient(circle_at_bottom_right,#eef8ff,transparent_28%),linear-gradient(180deg,#ffffff,#faf7ff)]">
        <div className="mx-auto w-full max-w-[1280px] animate-pulse px-4 pb-14 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-20">
          <div className={`${publicGlassCardClass} h-56 bg-[#fbf9ff]`} />
          <div className={`${publicSoftPanelClass} mt-6 h-40 bg-[#fbf9ff]`} />
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className={`${publicSoftPanelClass} h-[380px] bg-[#fbf9ff]`} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        dmSans.className,
        "h-full min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_top_left,#f4efff,transparent_24%),radial-gradient(circle_at_bottom_right,#eef8ff,transparent_28%),linear-gradient(180deg,#ffffff,#faf7ff)]",
      )}
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 pb-14 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-20">
        <section className={`${publicGlassCardClass} viao-surface-glow viao-fade-up relative overflow-hidden px-5 py-6 sm:px-7 lg:px-8`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,rgba(124,92,255,0.18),transparent_52%),radial-gradient(circle_at_top_right,rgba(101,213,255,0.12),transparent_42%)]" />
          <div className="relative space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#887ab8]">Discover</p>
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-4xl">
                  <h1
                    className={cn(
                      dmSerif.className,
                      "text-[2.5rem] leading-[1.02] tracking-[-0.04em] text-[#24154b] sm:text-5xl lg:text-[4rem]",
                    )}
                  >
                    Push wider without losing your VIAO feel.
                  </h1>
                  <p className="mt-4 max-w-2xl text-[16px] leading-7 text-[#6a5f8f] sm:text-lg sm:leading-8">
                    Cast a wider net without losing what already feels like you.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    asChild
                    className="h-11 rounded-full bg-[#7c5cff] px-5 text-white shadow-[0_14px_28px_rgba(124,92,255,0.24)] hover:bg-[#6c4ef7]"
                  >
                    <Link href="/account">
                      Tune my preferences
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className={cn(publicPillClass, "bg-white/92 text-[#6a5f8f]")}>
                  <MapPin className="h-4 w-4 text-[#7c5cff]" />
                  <span>{userLocation ? `Around ${locationLabel}` : "Add your city so nearby plans feel more relevant"}</span>
                </div>
                <div className={cn(publicPillClass, "bg-white/92 text-[#6a5f8f]")}>
                  <Sparkles className="h-4 w-4 text-[#7c5cff]" />
                  <span>
                    {userInterests.length > 0
                      ? `${interestMatchCount} matches shaped by ${userInterests.slice(0, 2).join(" · ")}${userInterests.length > 2 ? ` +${userInterests.length - 2}` : ""}`
                      : "Pick interests so recommendations feel more personal"}
                  </span>
                </div>
              </div>

              <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
                <div className="min-w-[220px] snap-start rounded-[26px] border border-[#ece4ff] bg-white/94 px-4 py-4 shadow-[0_10px_24px_rgba(101,73,214,0.05)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a8fc2]">Available now</p>
                  <p className="mt-2 text-2xl font-semibold text-[#24154b]">{upcomingEvents.length}</p>
                  <p className="mt-2 text-sm leading-6 text-[#6a5f8f]">Upcoming plans you can compare before narrowing the field.</p>
                </div>
                <div className="min-w-[220px] snap-start rounded-[26px] border border-[#ece4ff] bg-white/94 px-4 py-4 shadow-[0_10px_24px_rgba(101,73,214,0.05)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a8fc2]">Closer to you</p>
                  <p className="mt-2 text-2xl font-semibold text-[#24154b]">{userLocation ? nearbyCount : interestMatchCount}</p>
                  <p className="mt-2 text-sm leading-6 text-[#6a5f8f]">
                    {userLocation ? `Already landing close to ${locationLabel}.` : "Best current matches shaped by your interests."}
                  </p>
                </div>
                <div className="min-w-[220px] snap-start rounded-[26px] border border-[#ece4ff] bg-white/94 px-4 py-4 shadow-[0_10px_24px_rgba(101,73,214,0.05)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a8fc2]">Hidden for now</p>
                      <p className="mt-2 text-2xl font-semibold text-[#24154b]">{hiddenCount}</p>
                    </div>
                    {hiddenCount > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={clearDismissedEvents}
                        className="h-9 rounded-full bg-[#f8f5ff] px-3 text-xs font-semibold text-[#5e4ea6] hover:bg-[#efe7ff]"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restore
                      </Button>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#6a5f8f]">
                    {hiddenCount > 0 ? "Anything you parked with Not now can come back instantly." : "Use Not now when a plan looks interesting, just not for today."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={`${publicSoftPanelClass} viao-fade-up viao-delay-1 mt-6 p-4 sm:p-5`}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#887ab8]">Refine the mix</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#24154b]">Narrow the field without killing momentum.</h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-[#6a5f8f]">
                {filteredEvents.length} plan{filteredEvents.length === 1 ? "" : "s"} match right now, sorted by {sortLabels[sortBy].toLowerCase()}.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
              <div className="relative col-span-2 lg:col-span-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a8fc2]" />
                <Input
                  placeholder="Search events, places, or organizers..."
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
                    <Sparkles className="h-4 w-4" />
                    <SelectValue placeholder="Sort by" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">Best fit first</SelectItem>
                  <SelectItem value="date">Soonest first</SelectItem>
                  <SelectItem value="popularity">Most popular</SelectItem>
                  <SelectItem value="price">Lowest price</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {quickFilterOptions.map((option) => {
                const active = quickFilter === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setQuickFilter(option.id)}
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all",
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

            <div className="flex flex-col gap-3 rounded-[24px] border border-[#ebe2ff] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(249,245,255,0.9))] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#24154b]">
                  {activeQuickFilter ? activeQuickFilter.label : "All upcoming"} with {sortLabels[sortBy].toLowerCase()}
                </p>
                <p className="text-sm text-[#6a5f8f]">{resultSummary}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {hiddenCount > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearDismissedEvents}
                    className="h-10 rounded-full border-[#ddd1ff] bg-white text-[#5e4ea6] hover:bg-[#f6f1ff]"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Bring back {hiddenCount}
                  </Button>
                ) : null}
                {hasActiveFilters ? (
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="h-10 rounded-full border-[#ddd1ff] bg-white text-[#5e4ea6] hover:bg-[#f6f1ff]"
                  >
                    Clear filters
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {visibleEvents.length > 0 ? (
          <>
            <section className="viao-fade-up viao-delay-2 mt-6">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#887ab8]">Worth considering</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#24154b]">Plans worth a real look.</h2>
                </div>
                <p className="max-w-xl text-sm leading-7 text-[#6a5f8f]">
                  {filteredEvents.length} plans fit this mix right now. Use Not now when something is interesting, just not today.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {visibleEvents.map((event, index) => (
                  <article
                    key={event.id}
                    className={cn(
                      publicSoftPanelClass,
                      "viao-fade-up flex flex-col overflow-hidden p-0 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_28px_56px_rgba(101,73,214,0.12)]",
                      getRevealDelay(index + 1),
                    )}
                  >
                    <button type="button" onClick={() => openEventDetails(event.id)} className="group flex flex-1 flex-col text-left">
                      <div className="relative aspect-[1.28/1] overflow-hidden">
                        <AppImage
                          src={event.imageUrl}
                          alt={event.title}
                          fill
                          sizes="(min-width: 1536px) 28vw, (min-width: 768px) 48vw, 100vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(23,10,54,0.74)] via-transparent to-transparent" />
                        <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
                          <Badge className="rounded-full bg-white/92 px-3 py-1 text-[#24154b] shadow-none">
                            <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${getEventCategoryColor(event.category)}`} />
                            {event.category}
                          </Badge>
                          <div className="flex flex-wrap justify-end gap-2">
                            <Badge className="rounded-full bg-[#f6f1ff] px-3 py-1 text-[#5f43e5] shadow-none">
                              {formatRelativeEventLabel(event)}
                            </Badge>
                            {event.isBoosted ? <Badge className="rounded-full bg-white/92 px-3 py-1 text-[#5f43e5] shadow-none">Featured</Badge> : null}
                          </div>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 space-y-2 px-4 pb-4">
                          <p className="line-clamp-2 text-xl font-semibold leading-tight tracking-[-0.03em] text-white">{event.title}</p>
                          <Badge className="w-fit rounded-full bg-white/92 px-3 py-1 text-[#4f33d8] shadow-none">
                            {getRecommendationReason(event, normalizedUserInterests, userLocation)}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col p-5">
                        <p className="line-clamp-2 text-sm leading-7 text-[#6a5f8f]">{event.description}</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                      </div>
                    </button>

                    <div className="flex flex-col gap-3 border-t border-[#efe8ff] px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-[#5d5184]">{event.attendeesCount ?? 0} interested</div>
                        <div className="text-base font-semibold text-[#24154b]">{event.price === 0 ? "Free" : `CHF ${event.price ?? 0}`}</div>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <EventQuickActions event={event} onDismiss={dismissEvent} />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openEventDetails(event.id)}
                          className="h-10 rounded-full border-[#ddd1ff] bg-white text-[#5e4ea6] hover:bg-[#f6f1ff]"
                        >
                          Open details
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <div className="viao-fade-up viao-delay-3 mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button
                variant="outline"
                onClick={resetFilters}
                className="h-11 rounded-full border-[#ddd1ff] bg-white text-[#5e4ea6] hover:bg-[#f6f1ff]"
              >
                Start fresh
              </Button>

              {visibleCount < filteredEvents.length ? (
                <Button
                  onClick={() => setVisibleCount((current) => current + DEFAULT_VISIBLE_COUNT)}
                  className="h-11 rounded-full bg-[#7c5cff] text-white shadow-[0_14px_28px_rgba(124,92,255,0.24)] hover:bg-[#6c4ef7]"
                >
                  Show more
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <section className={`${publicSoftPanelClass} viao-fade-up viao-delay-2 mt-6 p-8 sm:p-10`}>
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#f5f0ff] text-[#7c5cff]">
                <Search className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-[#24154b]">Nothing matches this mix yet.</h2>
              <p className="mt-3 text-sm leading-7 text-[#6a5f8f]">
                Widen a filter, clear the search, or sharpen your city and interests to uncover better fits.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="h-11 rounded-full border-[#ddd1ff] bg-white text-[#5e4ea6] hover:bg-[#f6f1ff]"
                >
                  Clear filters
                </Button>
                <Button
                  asChild
                  className="h-11 rounded-full bg-[#7c5cff] text-white shadow-[0_14px_28px_rgba(124,92,255,0.24)] hover:bg-[#6c4ef7]"
                >
                  <Link href="/account">Tune my profile</Link>
                </Button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
