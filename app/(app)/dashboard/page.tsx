"use client"

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DM_Sans, DM_Serif_Display } from "next/font/google"
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Compass,
  Loader2,
  MapPin,
  MessageSquare,
  Sparkles,
  Target,
} from "lucide-react"

import EventQuickActions from "@/components/event-quick-actions"
import { publicGlassCardClass, publicPillClass, publicSoftPanelClass } from "@/components/public-page-shell"
import { AppImage } from "@/components/ui/app-image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/context/auth-context"
import { useEvents } from "@/context/events-context"
import { useMessaging } from "@/context/messaging-context"
import { useToast } from "@/hooks/use-toast"
import { useDismissedEvents } from "@/hooks/use-dismissed-events"
import { getEventCategoryColor } from "@/lib/event-categories"
import {
  compareExploreEvents,
  compareRecommendedEvents,
  eventMatchesInterest,
  eventMatchesLocation,
  formatEventDateLabel,
  formatEventTimeLabel,
  formatRelativeEventLabel,
  getDiscoverLocationLabel,
  getEventTimestamp,
  getPlanStatusLabel,
  getRecommendationReason,
  haveSameEntries,
  isPlannedEvent,
  isUpcomingEvent,
} from "@/lib/event-discovery"
import { USER_INTEREST_OPTIONS } from "@/lib/user-interests"
import { cn, getLocationString } from "@/lib/utils"

const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"] })
const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: ["400"] })

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isLoading: authLoading, updateUser } = useAuth()
  const { events, isLoading: eventsLoading } = useEvents()
  const { unreadCount } = useMessaging()
  const didInitializeSetupEditor = useRef(false)
  const { dismissedIds, dismissedSet, dismissEvent, clearDismissedEvents } = useDismissedEvents(user?.id)

  const [showSetupEditor, setShowSetupEditor] = useState(false)
  const [showInterestEditor, setShowInterestEditor] = useState(false)
  const [locationDraft, setLocationDraft] = useState("")
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [setupError, setSetupError] = useState<string | null>(null)
  const [isSavingSetup, setIsSavingSetup] = useState(false)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)

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

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/")
    }
  }, [authLoading, router, user])

  useEffect(() => {
    setLocationDraft(userLocation)
    setSelectedInterests(userInterests)

    if (!didInitializeSetupEditor.current) {
      setShowSetupEditor(userLocation.length === 0 || userInterests.length === 0)
      setShowInterestEditor(userInterests.length === 0)
      didInitializeSetupEditor.current = true
    } else if (userInterests.length === 0) {
      setShowInterestEditor(true)
    }
  }, [userInterests, userLocation])

  const upcomingEvents = useMemo(
    () =>
      events
        .filter(isUpcomingEvent)
        .filter((event) => !dismissedSet.has(event.id) || isPlannedEvent(event))
        .sort((a, b) => getEventTimestamp(a) - getEventTimestamp(b)),
    [dismissedSet, events],
  )

  const plannedEvents = useMemo(
    () => upcomingEvents.filter((event) => isPlannedEvent(event)).sort((a, b) => getEventTimestamp(a) - getEventTimestamp(b)),
    [upcomingEvents],
  )

  const plannedIds = useMemo(() => new Set(plannedEvents.map((event) => event.id)), [plannedEvents])
  const nextPlannedEvent = plannedEvents[0] ?? null

  const recommendedEvents = useMemo(
    () =>
      upcomingEvents
        .filter((event) => !plannedIds.has(event.id))
        .sort((a, b) => compareRecommendedEvents(a, b, normalizedUserInterests, userLocation))
        .slice(0, 3),
    [normalizedUserInterests, plannedIds, upcomingEvents, userLocation],
  )

  const savedCount = useMemo(() => upcomingEvents.filter((event) => event.isSaved).length, [upcomingEvents])

  const rsvpCount = useMemo(
    () => upcomingEvents.filter((event) => event.rsvpStatus === "GOING" || event.rsvpStatus === "MAYBE").length,
    [upcomingEvents],
  )

  const recommendationCount = useMemo(
    () =>
      upcomingEvents.filter(
        (event) => eventMatchesInterest(event, normalizedUserInterests) || eventMatchesLocation(event, userLocation),
      ).length,
    [normalizedUserInterests, upcomingEvents, userLocation],
  )

  const hiddenCount = dismissedIds.length

  const recommendedIds = useMemo(() => new Set(recommendedEvents.map((event) => event.id)), [recommendedEvents])

  const discoverPreviewEvents = useMemo(
    () =>
      upcomingEvents
        .filter((event) => !plannedIds.has(event.id) && !recommendedIds.has(event.id))
        .sort((a, b) => compareExploreEvents(a, b, "date", normalizedUserInterests, userLocation))
        .slice(0, 3),
    [normalizedUserInterests, plannedIds, recommendedIds, upcomingEvents, userLocation],
  )

  const setupChecklist = [
    {
      label: userLocation ? `${getDiscoverLocationLabel(userLocation)} is guiding nearby events` : "Add your city so nearby events rise first",
      done: Boolean(userLocation),
    },
    {
      label:
        userInterests.length > 0
          ? `${userInterests.length} interests are shaping your local mix`
          : "Pick a few interests so the event mix feels more like you",
      done: userInterests.length > 0,
    },
  ]

  const setupStepsRemaining = setupChecklist.filter((item) => !item.done).length
  const locationLabel = getDiscoverLocationLabel(userLocation)
  const firstName = user?.name?.trim().split(/\s+/)[0] || "there"
  const hasSetupChanges =
    locationDraft.trim() !== userLocation || !haveSameEntries(selectedInterests, userInterests)

  const heroTitle = nextPlannedEvent
    ? "Your next plan is already lined up."
    : setupStepsRemaining === 0
      ? "Your local scene is starting to fit."
      : "Shape what feels worth your time."

  const heroDescription = nextPlannedEvent
    ? `Welcome back, ${firstName}. ${nextPlannedEvent.title} is already on your radar. Pick it back up, reply faster, and keep momentum around the plans that already feel real.`
    : setupStepsRemaining === 0
      ? `Welcome back, ${firstName}. Around ${locationLabel}, Viao can now surface nearby plans, people, and timing that feel more like your kind of night.`
      : `Welcome back, ${firstName}. Add your city and a few interests so Viao can surface plans, people, and neighborhoods that actually fit.`

  const heroPills = [
    {
      icon: MapPin,
      text: userLocation ? `Around ${locationLabel}` : "Add a city for nearby events",
    },
    {
      icon: Sparkles,
      text:
        userInterests.length > 0
          ? `${userInterests.slice(0, 2).join(" · ")}${userInterests.length > 2 ? ` +${userInterests.length - 2}` : ""}`
          : "Pick interests for a better mix",
    },
  ]

  const overviewCards: Array<{
    icon: ComponentType<{ className?: string }>
    label: string
    value: string
    detail: string
  }> = [
    {
      icon: CalendarDays,
      label: "Next plan",
      value: nextPlannedEvent ? formatRelativeEventLabel(nextPlannedEvent) : "No plan saved",
      detail: nextPlannedEvent ? nextPlannedEvent.title : "Save or RSVP and it stays easy to revisit",
    },
    {
      icon: MessageSquare,
      label: "Messages",
      value: unreadCount > 0 ? `${unreadCount} unread` : "Caught up",
      detail: unreadCount > 0 ? "Replies are waiting in your inbox" : "No replies waiting right now",
    },
    {
      icon: Target,
      label: "Local mix",
      value: setupStepsRemaining === 0 ? "Dialed in" : `${setupStepsRemaining} left`,
      detail:
        setupStepsRemaining === 0
          ? `Events are rising around ${locationLabel}`
          : "Add your city and interests so better plans surface first",
    },
  ]

  async function handleSaveSetup() {
    const nextLocation = locationDraft.trim()
    const nextInterests = Array.from(new Set(selectedInterests.map((interest) => interest.trim()).filter(Boolean)))
    const updates: Partial<typeof user> & { preferences?: Record<string, unknown> } = {}

    if (nextLocation.length > 0 && nextLocation !== userLocation) {
      updates.location = nextLocation
    }

    if (!haveSameEntries(nextInterests, userInterests)) {
      updates.interests = nextInterests
    }

    if (Object.keys(updates).length === 0) {
      setShowSetupEditor(false)
      return
    }

    setIsSavingSetup(true)
    setSetupError(null)

    try {
      await updateUser(updates)
      toast({
        title: "Preferences saved",
        description:
          nextLocation.length > 0
            ? `Viao will pull in more around ${nextLocation}.`
            : "Your interests were updated.",
      })
      setShowSetupEditor(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save your preferences"
      setSetupError(message)
      toast({
        title: "Could not save preferences",
        description: message,
      })
    } finally {
      setIsSavingSetup(false)
    }
  }

  function openEventDetails(eventId: string) {
    router.push(`/events/${eventId}?from=dashboard`)
  }

  function handleToggleInterest(interest: string) {
    setSelectedInterests((current) =>
      current.includes(interest) ? current.filter((value) => value !== interest) : [...current, interest],
    )
  }

  function handleUseCurrentLocation() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      const message = "Location services are not available on this device."
      setSetupError(message)
      toast({ title: "Location unavailable", description: message })
      return
    }

    setIsDetectingLocation(true)
    setSetupError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(
            `/api/location/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}`,
            { cache: "no-store" },
          )
          const data = await response.json().catch(() => null)
          if (!response.ok) throw new Error(data?.error || "Could not detect location")
          const location = typeof data?.location === "string" ? data.location : data?.city
          if (!location) throw new Error("No location data returned")

          setLocationDraft(location)
          await updateUser({ location })
          toast({
            title: "Location added",
            description: `Viao will bring more in from ${location}.`,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to detect location"
          setSetupError(message)
          toast({ title: "Location failed", description: message })
        } finally {
          setIsDetectingLocation(false)
        }
      },
      (error) => {
        const message = error?.message || "Location access is off on this device."
        setSetupError(message)
        setIsDetectingLocation(false)
        toast({ title: "Location failed", description: message })
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    )
  }

  if (authLoading || !user || eventsLoading) {
    return (
      <div className="h-full min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_top_left,#f4efff,transparent_24%),radial-gradient(circle_at_bottom_right,#eef8ff,transparent_28%),linear-gradient(180deg,#ffffff,#faf7ff)]">
        <div className="mx-auto w-full max-w-[1280px] animate-pulse px-4 pb-14 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-20">
          <div className={`${publicGlassCardClass} space-y-6 px-5 py-6 sm:px-7 lg:px-10 lg:py-9`}>
            <div className="h-4 w-20 rounded-full bg-[#ede6ff]" />
            <div className="space-y-4">
              <div className="h-16 max-w-3xl rounded-[28px] bg-[#f2edff]" />
              <div className="h-6 max-w-2xl rounded-full bg-[#f6f1ff]" />
              <div className="flex flex-wrap gap-3">
                <div className="h-10 w-48 rounded-full bg-[#f6f1ff]" />
                <div className="h-10 w-48 rounded-full bg-[#f6f1ff]" />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-32 rounded-[26px] bg-[#fbf9ff]" />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
            <div className={`${publicSoftPanelClass} h-[360px] bg-[#fbf9ff]`} />
            <div className="space-y-4">
              <div className={`${publicSoftPanelClass} h-[112px] bg-[#fbf9ff]`} />
              <div className={`${publicSoftPanelClass} h-[112px] bg-[#fbf9ff]`} />
              <div className={`${publicSoftPanelClass} h-[112px] bg-[#fbf9ff]`} />
            </div>
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
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#887ab8]">For you</p>
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="max-w-4xl">
                  <h1
                    className={cn(
                      dmSerif.className,
                      "text-4xl leading-[1.02] tracking-[-0.04em] text-[#24154b] sm:text-5xl lg:text-[4rem]",
                    )}
                  >
                    {heroTitle}
                  </h1>
                  <p className="mt-4 max-w-2xl text-[17px] leading-8 text-[#6a5f8f] sm:text-lg">{heroDescription}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => (nextPlannedEvent ? openEventDetails(nextPlannedEvent.id) : router.push("/discover"))}
                    className="h-11 rounded-full bg-[#7c5cff] px-5 text-white shadow-[0_14px_28px_rgba(124,92,255,0.24)] hover:bg-[#6c4ef7]"
                  >
                    {nextPlannedEvent ? "See next plan" : "Find more plans"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-11 rounded-full border-[#ddd1ff] bg-white text-[#5e4ea6] hover:bg-[#f6f1ff]"
                  >
                    <Link href="/my-events">See saved plans</Link>
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {heroPills.map(({ icon: Icon, text }) => (
                  <div key={text} className={cn(publicPillClass, "border-[#e8dcff] bg-white/92 text-[#6a5f8f]")}>
                    <Icon className="h-4 w-4 text-[#7c5cff]" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {overviewCards.map(({ icon: Icon, label, value, detail }) => (
                <div
                  key={label}
                  className="viao-fade-up rounded-[26px] border border-[#ece4ff] bg-white/94 px-4 py-4 shadow-[0_10px_24px_rgba(101,73,214,0.05)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-[18px] bg-[#f5efff] text-[#7c5cff]">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a8fc2]">{label}</p>
                      <p className="text-base font-semibold text-[#24154b]">{value}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#6a5f8f]">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {showSetupEditor ? (
          <section className={`${publicSoftPanelClass} viao-fade-up viao-delay-1 mt-6 p-5 sm:p-6`}>
            <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#887ab8]">Personalize Viao</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#24154b]">
                    Shape what feels worth your time.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[#6a5f8f]">
                    Your city and interests shape which events, hosts, and neighborhoods show up first.
                  </p>
                </div>

                <div className="space-y-3">
                  {setupChecklist.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-start gap-3 rounded-[22px] border border-[#efe8ff] bg-white px-4 py-4"
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                          item.done
                            ? "border-[#d8f1e1] bg-[#effaf3] text-[#177245]"
                            : "border-[#eadffd] bg-[#faf7ff] text-[#7c5cff]",
                        )}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <p className="text-sm leading-6 text-[#5d5184]">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-[26px] border border-[#efe8ff] bg-white px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                    <div className="min-w-0 flex-1">
                      <label className="text-sm font-medium text-[#24154b]" htmlFor="dashboard-location">
                        City or area
                      </label>
                      <div className="relative mt-2">
                        <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9185ba]" />
                        <Input
                          id="dashboard-location"
                          value={locationDraft}
                          onChange={(event) => setLocationDraft(event.target.value)}
                          placeholder="Zurich, Geneva, Lausanne..."
                          className="h-12 rounded-full border-[#e7defe] bg-white/96 pl-11 text-[#24154b] placeholder:text-[#9a8fc2]"
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleUseCurrentLocation}
                      disabled={isDetectingLocation}
                      className="h-11 rounded-full border-[#ddd1ff] bg-white text-[#5e4ea6] hover:bg-[#f6f1ff]"
                    >
                      {isDetectingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                      Use my location
                    </Button>
                  </div>
                </div>

                <div className="rounded-[26px] border border-[#efe8ff] bg-white px-4 py-4 sm:px-5">
                  {selectedInterests.length > 0 && !showInterestEditor ? (
                    <>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-[#24154b]">Interests</p>
                          <p className="mt-1 text-sm leading-6 text-[#6a5f8f]">
                            These are already shaping your event mix. Change them any time.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowInterestEditor(true)}
                          className="h-10 rounded-full border-[#ddd1ff] bg-white text-[#5e4ea6] hover:bg-[#f6f1ff]"
                        >
                          Edit interests
                        </Button>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedInterests.map((interest) => (
                          <span
                            key={interest}
                            className="rounded-full border border-[#cdbdff] bg-[#f6f1ff] px-3 py-2 text-sm font-medium text-[#4f33d8]"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-[#24154b]">Interests</p>
                          <p className="mt-1 text-sm leading-6 text-[#6a5f8f]">
                            Pick what should matter most when Viao lines up nearby plans.
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-medium text-[#5f43e5]">{selectedInterests.length} selected</p>
                          {selectedInterests.length > 0 ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowInterestEditor(false)}
                              className="h-9 rounded-full border-[#ddd1ff] bg-white px-4 text-[#5e4ea6] hover:bg-[#f6f1ff]"
                            >
                              Done editing
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {USER_INTEREST_OPTIONS.map((interest) => {
                          const active = selectedInterests.includes(interest)
                          return (
                            <button
                              key={interest}
                              type="button"
                              onClick={() => handleToggleInterest(interest)}
                              className={cn(
                                "rounded-full border px-3 py-2 text-sm font-medium transition-all",
                                active
                                  ? "border-[#cdbdff] bg-[#f6f1ff] text-[#4f33d8]"
                                  : "border-[#e8deff] bg-white text-[#5d5184] hover:border-[#cdbdff] hover:text-[#4f33d8]",
                              )}
                            >
                              {interest}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>

                {setupError ? (
                  <p className="rounded-[22px] border border-[#ffd8e0] bg-[#fff6f8] px-4 py-3 text-sm text-[#b13053]">
                    {setupError}
                  </p>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSetupEditor(false)}
                    className="h-11 rounded-full border-[#ddd1ff] bg-white text-[#5e4ea6] hover:bg-[#f6f1ff]"
                  >
                    Hide for now
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveSetup}
                    disabled={isSavingSetup || !hasSetupChanges}
                    className="h-11 rounded-full bg-[#7c5cff] px-5 text-white shadow-[0_14px_28px_rgba(124,92,255,0.24)] hover:bg-[#6c4ef7]"
                  >
                    {isSavingSetup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Save preferences
                  </Button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className={`${publicSoftPanelClass} viao-fade-up viao-delay-1 mt-6 px-5 py-5 sm:px-6`}>
            {setupStepsRemaining > 0 ? (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#887ab8]">Finish your mix</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#24154b]">Give Viao a little more signal.</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-[#6a5f8f]">
                    One city and a few interests are enough to make VIAO feel far less random.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className={cn(publicPillClass, "border-[#e8dcff] bg-white/92 text-[#6a5f8f]")}>
                    <Sparkles className="h-4 w-4 text-[#7c5cff]" />
                    <span>{setupStepsRemaining} step{setupStepsRemaining === 1 ? "" : "s"} left</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSetupEditor(true)}
                    className="h-11 rounded-full border-[#ddd1ff] bg-white text-[#5e4ea6] hover:bg-[#f6f1ff]"
                  >
                    Finish preferences
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#887ab8]">Ready around {locationLabel}</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#24154b]">Your best fits can stay clear now.</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-[#6a5f8f]">
                      Plans, replies, and stronger fits can stay close while you still reach wider whenever you want more options.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowSetupEditor(true)}
                      className="h-11 rounded-full border-[#ddd1ff] bg-white text-[#5e4ea6] hover:bg-[#f6f1ff]"
                    >
                      Update preferences
                    </Button>
                    <Button
                      asChild
                      className="h-11 rounded-full bg-[#7c5cff] px-5 text-white shadow-[0_14px_28px_rgba(124,92,255,0.24)] hover:bg-[#6c4ef7]"
                    >
                      <Link href="/discover">
                        Find more plans
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[22px] border border-[#ece4ff] bg-white/94 px-4 py-4 shadow-[0_8px_20px_rgba(101,73,214,0.05)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a8fc2]">City</p>
                    <p className="mt-2 text-base font-semibold text-[#24154b]">{locationLabel}</p>
                    <p className="mt-1 text-sm text-[#6a5f8f]">Nearby events keep getting first look.</p>
                  </div>
                  <div className="rounded-[22px] border border-[#ece4ff] bg-white/94 px-4 py-4 shadow-[0_8px_20px_rgba(101,73,214,0.05)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a8fc2]">Interests</p>
                    <p className="mt-2 text-base font-semibold text-[#24154b]">{userInterests.length} selected</p>
                    <p className="mt-1 text-sm text-[#6a5f8f]">{userInterests.slice(0, 2).join(" · ")}{userInterests.length > 2 ? ` +${userInterests.length - 2}` : ""}</p>
                  </div>
                  <div className="rounded-[22px] border border-[#ece4ff] bg-white/94 px-4 py-4 shadow-[0_8px_20px_rgba(101,73,214,0.05)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a8fc2]">Good fits</p>
                    <p className="mt-2 text-base font-semibold text-[#24154b]">{recommendationCount}</p>
                    <p className="mt-1 text-sm text-[#6a5f8f]">Open right now around your city or interests.</p>
                  </div>
                  <div className="rounded-[22px] border border-[#ece4ff] bg-white/94 px-4 py-4 shadow-[0_8px_20px_rgba(101,73,214,0.05)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a8fc2]">Hidden for now</p>
                    <p className="mt-2 text-base font-semibold text-[#24154b]">{hiddenCount}</p>
                    <div className="mt-2">
                      {hiddenCount > 0 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={clearDismissedEvents}
                          className="h-8 rounded-full bg-[#f8f5ff] px-3 text-xs font-semibold text-[#5e4ea6] hover:bg-[#efe7ff]"
                        >
                          Bring them back
                        </Button>
                      ) : (
                        <p className="text-sm text-[#6a5f8f]">Nothing hidden at the moment.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_360px]">
          <section className={`${publicSoftPanelClass} viao-fade-up viao-delay-2 overflow-hidden p-0`}>
            {nextPlannedEvent ? (
              <div className="grid gap-0 lg:grid-cols-[1.05fr_minmax(0,0.95fr)]">
                <div className="relative min-h-[280px] overflow-hidden bg-[#f7f3ff]">
                  <AppImage
                    src={nextPlannedEvent.imageUrl}
                    alt={nextPlannedEvent.title}
                    fill
                    sizes="(min-width: 1280px) 48vw, 100vw"
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[rgba(22,10,54,0.72)] via-[rgba(22,10,54,0.16)] to-transparent" />
                  <div className="absolute inset-x-0 top-0 flex flex-wrap gap-2 px-5 pt-5">
                    <Badge className="rounded-full bg-white/92 px-3 py-1 text-[#24154b] shadow-none">
                      {getPlanStatusLabel(nextPlannedEvent)}
                    </Badge>
                    <Badge className="rounded-full bg-[#f6f1ff] px-3 py-1 text-[#5f43e5] shadow-none">
                      {formatRelativeEventLabel(nextPlannedEvent)}
                    </Badge>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Next up</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">{nextPlannedEvent.title}</h2>
                    <p className="mt-3 max-w-xl text-sm leading-7 text-white/84">{nextPlannedEvent.description}</p>
                  </div>
                </div>

                <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#887ab8]">Your next plan</p>
                    <p className="mt-2 text-sm leading-7 text-[#6a5f8f]">
                      The plan you already saved should be one tap away whenever you come back.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[22px] border border-[#efe8ff] bg-[#fbf9ff] px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#887ab8]">When</p>
                      <p className="mt-2 text-sm font-semibold text-[#24154b]">{formatEventDateLabel(nextPlannedEvent)}</p>
                      <p className="mt-1 text-sm text-[#6a5f8f]">{formatEventTimeLabel(nextPlannedEvent)}</p>
                    </div>
                    <div className="rounded-[22px] border border-[#efe8ff] bg-[#fbf9ff] px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#887ab8]">Where</p>
                      <p className="mt-2 text-sm font-semibold text-[#24154b]">
                        {nextPlannedEvent.city || getLocationString(nextPlannedEvent.location)}
                      </p>
                      <p className="mt-1 text-sm text-[#6a5f8f]">{getLocationString(nextPlannedEvent.location)}</p>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-[#efe8ff] bg-white px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#887ab8]">Hosted by</p>
                    <p className="mt-2 text-sm font-semibold text-[#24154b]">{nextPlannedEvent.organizerName || "Viao host"}</p>
                    <p className="mt-1 text-sm text-[#6a5f8f]">
                      {nextPlannedEvent.attendeesCount ?? 0} interested · {nextPlannedEvent.price === 0 ? "Free" : `CHF ${nextPlannedEvent.price ?? 0}`}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      onClick={() => openEventDetails(nextPlannedEvent.id)}
                      className="h-11 flex-1 rounded-full bg-[#7c5cff] text-white shadow-[0_14px_28px_rgba(124,92,255,0.24)] hover:bg-[#6c4ef7]"
                    >
                      Open event
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 flex-1 rounded-full border-[#ddd1ff] bg-white text-[#5e4ea6] hover:bg-[#f6f1ff]"
                    >
                      <Link href="/my-events">View all plans</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-5 py-6 sm:px-6 sm:py-7">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#887ab8]">Next up</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#24154b]">
                  Start with something worth saving.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6a5f8f]">
                  Save an event or RSVP once it feels real, and Viao keeps that plan within reach every time you come back.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {recommendedEvents.slice(0, 2).map((event) => (
                    <article
                      key={event.id}
                      className="overflow-hidden rounded-[24px] border border-[#efe8ff] bg-white shadow-[0_12px_28px_rgba(101,73,214,0.05)] transition-all hover:-translate-y-0.5 hover:border-[#d8cbff] hover:shadow-[0_18px_36px_rgba(101,73,214,0.1)]"
                    >
                      <button type="button" onClick={() => openEventDetails(event.id)} className="w-full text-left">
                        <div className="relative aspect-[1.5/1] bg-[#f7f3ff]">
                          <AppImage src={event.imageUrl} alt={event.title} fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(23,10,54,0.65)] via-transparent to-transparent" />
                          <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
                            <p className="line-clamp-2 text-xl font-semibold leading-tight tracking-[-0.03em] text-white">{event.title}</p>
                          </div>
                        </div>
                        <div className="space-y-2 p-4">
                          <p className="text-sm font-medium text-[#24154b]">{formatEventDateLabel(event)}</p>
                          <p className="text-sm text-[#6a5f8f]">{getRecommendationReason(event, normalizedUserInterests, userLocation)}</p>
                        </div>
                      </button>
                      <div className="flex flex-col gap-3 border-t border-[#efe8ff] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <EventQuickActions event={event} compact onDismiss={dismissEvent} />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openEventDetails(event.id)}
                          className="h-9 rounded-full border-[#ddd1ff] bg-white text-[#5e4ea6] hover:bg-[#f6f1ff]"
                        >
                          Open
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="h-11 rounded-full bg-[#7c5cff] text-white shadow-[0_14px_28px_rgba(124,92,255,0.24)] hover:bg-[#6c4ef7]">
                    <Link href="/discover">
                      Find more plans
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-11 rounded-full border-[#ddd1ff] bg-white text-[#5e4ea6] hover:bg-[#f6f1ff]"
                  >
                    <Link href="/my-events">See saved plans</Link>
                  </Button>
                </div>
              </div>
            )}
          </section>

          <aside className="viao-fade-up viao-delay-3 space-y-4">
            <Link
              href="/messages"
              className={`${publicSoftPanelClass} block p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(101,73,214,0.11)]`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[20px] bg-[#f5efff] text-[#7c5cff]">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <Badge className="rounded-full bg-[#f6f1ff] px-3 py-1 text-[#5f43e5] shadow-none">
                  {unreadCount > 0 ? unreadCount : "0"}
                </Badge>
              </div>
              <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[#24154b]">Messages</h3>
              <p className="mt-2 text-sm leading-7 text-[#6a5f8f]">
                {unreadCount > 0
                  ? `You have ${unreadCount} unread message${unreadCount === 1 ? "" : "s"} waiting.`
                  : "Nothing urgent is pulling you back to the inbox right now."}
              </p>
              <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#5f43e5]">
                Reply now
                <ArrowRight className="h-4 w-4" />
              </p>
            </Link>

            <Link
              href="/my-events"
              className={`${publicSoftPanelClass} block p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(101,73,214,0.11)]`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[20px] bg-[#f5efff] text-[#7c5cff]">
                  <Bookmark className="h-5 w-5" />
                </div>
                <Badge className="rounded-full bg-[#eef9ff] px-3 py-1 text-[#1d6da3] shadow-none">
                  {savedCount + rsvpCount}
                </Badge>
              </div>
              <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[#24154b]">Saved plans</h3>
              <p className="mt-2 text-sm leading-7 text-[#6a5f8f]">
                {savedCount} saved and {rsvpCount} RSVP&apos;d event{savedCount + rsvpCount === 1 ? "" : "s"} are staying
                within reach.
              </p>
              <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#5f43e5]">
                See saved plans
                <ArrowRight className="h-4 w-4" />
              </p>
            </Link>

            <button
              type="button"
              onClick={() => (setupStepsRemaining > 0 ? setShowSetupEditor(true) : router.push("/discover"))}
              className={`${publicSoftPanelClass} w-full p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(101,73,214,0.11)]`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[20px] bg-[#f5efff] text-[#7c5cff]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <Badge className="rounded-full bg-[#f6f1ff] px-3 py-1 text-[#5f43e5] shadow-none">
                  {setupStepsRemaining > 0 ? `${setupStepsRemaining} left` : recommendationCount}
                </Badge>
              </div>
              <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[#24154b]">
                {setupStepsRemaining > 0 ? "Tune your local mix" : "More around you"}
              </h3>
              <p className="mt-2 text-sm leading-7 text-[#6a5f8f]">
                {setupStepsRemaining > 0
                  ? "Add your city or interests so better plans show up before the noise."
                  : `There are ${recommendationCount} plans around your city or interests that feel worth a closer look.`}
              </p>
              <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#5f43e5]">
                {setupStepsRemaining > 0 ? "Tune Viao" : "Find more plans"}
                <ArrowRight className="h-4 w-4" />
              </p>
            </button>
          </aside>
        </section>
        <section className="mt-8">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#887ab8]">
                {normalizedUserInterests.length > 0 || userLocation ? "Best fit right now" : "Worth your time first"}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#24154b]">
                {normalizedUserInterests.length > 0 || userLocation
                  ? "Start with what feels most relevant."
                  : "Start with the events most likely to feel worth your time."}
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[#6a5f8f]">
              {normalizedUserInterests.length > 0 || userLocation
                ? "Viao weighs your interests, city, timing, and real momentum to surface plans with a better chance of feeling right."
                : "Until your city and interests are set, Viao keeps this broader and leans on timing plus momentum."}
            </p>
          </div>

          {recommendedEvents.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-3">
              {recommendedEvents.map((event) => (
                <article
                  key={event.id}
                  className={`${publicSoftPanelClass} viao-fade-up viao-delay-2 flex flex-col overflow-hidden p-0 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_28px_56px_rgba(101,73,214,0.12)]`}
                >
                  <button type="button" onClick={() => openEventDetails(event.id)} className="group flex flex-1 flex-col text-left">
                    <div className="relative aspect-[1.4/1] overflow-hidden">
                      <AppImage
                        src={event.imageUrl}
                        alt={event.title}
                        fill
                        sizes="(min-width: 1024px) 32vw, 100vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(23,10,54,0.68)] via-transparent to-transparent" />
                      <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
                        <Badge className="rounded-full bg-white/92 px-3 py-1 text-[#24154b] shadow-none">
                          <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${getEventCategoryColor(event.category)}`} />
                          {event.category}
                        </Badge>
                        <Badge className="rounded-full bg-[#f6f1ff] px-3 py-1 text-[#5f43e5] shadow-none">
                          {getRecommendationReason(event, normalizedUserInterests, userLocation)}
                        </Badge>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
                        <p className="line-clamp-2 text-xl font-semibold leading-tight tracking-[-0.03em] text-white">{event.title}</p>
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
                      <div className="text-sm text-[#6a5f8f]">{event.attendeesCount ?? 0} interested</div>
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
          ) : (
            <div className={`${publicSoftPanelClass} p-8 sm:p-10`}>
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#f5f0ff] text-[#7c5cff]">
                  <Compass className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-[#24154b]">Nothing feels close enough yet.</h3>
                <p className="mt-3 text-sm leading-7 text-[#6a5f8f]">
                  Add one or two more clues about what you like, or widen the filters so stronger events can surface.
                </p>
              </div>
            </div>
          )}
        </section>
        <section className="viao-fade-up viao-delay-4 mt-8">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#887ab8]">Keep exploring</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#24154b]">
                Keep the momentum going.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[#6a5f8f]">
              Once the obvious fits are covered, widen the search and compare more options without losing what already feels promising.
            </p>
          </div>

          {discoverPreviewEvents.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-3">
              {discoverPreviewEvents.map((event) => (
                <article
                  key={event.id}
                  className={`${publicSoftPanelClass} flex flex-col overflow-hidden p-0 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_28px_56px_rgba(101,73,214,0.12)]`}
                >
                  <button type="button" onClick={() => openEventDetails(event.id)} className="group flex flex-1 flex-col text-left">
                    <div className="relative aspect-[1.35/1] overflow-hidden">
                      <AppImage
                        src={event.imageUrl}
                        alt={event.title}
                        fill
                        sizes="(min-width: 1024px) 32vw, 100vw"
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
                          {event.isBoosted ? <Badge className="rounded-full bg-[#f6f1ff] px-3 py-1 text-[#5f43e5] shadow-none">Featured</Badge> : null}
                        </div>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
                        <p className="line-clamp-2 text-xl font-semibold leading-tight tracking-[-0.03em] text-white">{event.title}</p>
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
                      <div className="text-sm text-[#6a5f8f]">{event.attendeesCount ?? 0} interested</div>
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
          ) : (
            <div className={`${publicSoftPanelClass} p-8 sm:p-10`}>
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#f5f0ff] text-[#7c5cff]">
                  <Compass className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-[#24154b]">More worthwhile plans are still out there.</h3>
                <p className="mt-3 text-sm leading-7 text-[#6a5f8f]">
                  Widen your city, loosen your filters, or chase a different mood to uncover something stronger.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="h-11 rounded-full bg-[#7c5cff] text-white shadow-[0_14px_28px_rgba(124,92,255,0.24)] hover:bg-[#6c4ef7]">
              <Link href="/discover">
                Find more plans
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-full border-[#ddd1ff] bg-white text-[#5e4ea6] hover:bg-[#f6f1ff]"
            >
              <Link href="/my-events">Keep my plans close</Link>
            </Button>
          </div>
        </section>

      </div>
    </div>
  )
}
