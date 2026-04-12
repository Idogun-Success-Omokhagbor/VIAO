"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DM_Sans, DM_Serif_Display } from "next/font/google"
import {
  ArrowRightOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CompassOutlined,
  EnvironmentOutlined,
  HeartOutlined,
  MessageOutlined,
  SearchOutlined,
} from "@ant-design/icons"
import { Alert, Button, Card, ConfigProvider, Empty, Input, Tag, Typography } from "antd"

import { BrandLockup } from "@/components/brand-logo"
import { Footer } from "@/components/footer"
import { AppImage } from "@/components/ui/app-image"
import { useAuth } from "@/context/auth-context"
import { getDefaultAppPath } from "@/lib/default-app-path"
import type { Event } from "@/types/event"

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
})

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
})

const marketingTheme = {
  token: {
    colorPrimary: "#5f43e5",
    colorInfo: "#5f43e5",
    colorSuccess: "#1f8f73",
    colorWarning: "#c88238",
    colorTextBase: "#1f1736",
    colorBgBase: "#f8f6fc",
    colorBorder: "#dfd8ee",
    borderRadius: 18,
    fontFamily: dmSans.style.fontFamily,
  },
  components: {
    Button: {
      controlHeightLG: 50,
      defaultShadow: "none",
      primaryShadow: "none",
      borderRadiusLG: 18,
      fontWeight: 600,
    },
    Card: {
      borderRadiusLG: 28,
    },
    Input: {
      controlHeightLG: 52,
    },
    Segmented: {
      trackBg: "rgba(255,255,255,0.45)",
      itemActiveBg: "rgba(255,255,255,0.94)",
      trackPadding: 6,
    },
  },
} as const

const glassCardClass =
  "border !border-[#e8e1f2] bg-white/96 shadow-[0_22px_56px_rgba(31,23,54,0.07)]"

const pillSurfaceClass =
  "rounded-full border border-[#ece5f2] bg-[#fcfbfe] shadow-[0_8px_18px_rgba(31,23,54,0.04)]"

const joinBenefitItems = [
  { icon: CheckCircleOutlined, label: "Save events for later" },
  { icon: CheckCircleOutlined, label: "RSVP when it is a yes" },
  { icon: HeartOutlined, label: "Keep a clean shortlist" },
  { icon: MessageOutlined, label: "Message organizers once you join" },
] as const

type SiteConfig = {
  maintenanceMode?: boolean
  announcement?: string
}

type EventPreviewCardProps = {
  event: Event
  onOpenEvent: (event: Event) => void
  priority?: boolean
}

type IntentFilter = "ALL" | "TONIGHT" | "THIS_WEEKEND" | "FREE" | "AFTER_WORK"

function formatPriceChf(price: number | null | undefined) {
  if (price === 0) {
    return "Free"
  }

  if (typeof price === "number") {
    return `CHF ${price}`
  }

  return "Free"
}

function getEventTimeValue(event: Event) {
  const raw = event.startsAt ?? event.date
  const value = new Date(raw).getTime()
  return Number.isNaN(value) ? Number.POSITIVE_INFINITY : value
}

function isPresentableHomepageEvent(event: Event) {
  const haystack = [event.title, event.description]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")

  return !/\b(qa|test|manual|dummy|sample|internal)\b/i.test(haystack)
}

function getEventDate(event: Event) {
  return new Date(event.startsAt ?? event.date)
}

function isTonightEvent(event: Event) {
  const value = getEventDate(event)
  const now = new Date()
  return Number.isFinite(value.getTime()) && value >= now && value.toDateString() === now.toDateString()
}

function isWeekendEvent(event: Event) {
  const value = getEventDate(event)
  if (!Number.isFinite(value.getTime())) {
    return false
  }

  const day = value.getDay()
  return day === 5 || day === 6 || day === 0
}

function isAfterWorkEvent(event: Event) {
  const value = getEventDate(event)
  if (!Number.isFinite(value.getTime())) {
    return false
  }

  const hour = value.getHours()
  return hour >= 17 && hour <= 21
}

function formatEventMoment(event: Event) {
  const raw = event.startsAt ?? event.date
  const value = new Date(raw)

  if (Number.isNaN(value.getTime())) {
    return "Date to be announced"
  }

  return value.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function describeLocation(event: Event) {
  const city = typeof event.city === "string" && event.city.trim().length > 0 ? event.city.trim() : ""
  const venue = typeof event.venue === "string" && event.venue.trim().length > 0 ? event.venue.trim() : ""
  const location = typeof event.location === "string" && event.location.trim().length > 0 ? event.location.trim() : ""

  if (venue && city) {
    return `${venue}, ${city}`
  }

  if (city) {
    return city
  }

  if (venue) {
    return venue
  }

  return location || "Location to be announced"
}

function getLocationChipLabel(event: Event) {
  const primary =
    typeof event.city === "string" && event.city.trim().length > 0
      ? event.city.trim()
      : typeof event.location === "string" && event.location.trim().length > 0
        ? event.location.trim().split(",")[0]?.trim() ?? ""
        : ""

  if (!primary) {
    return null
  }

  return primary.length > 24 ? `${primary.slice(0, 24).trim()}…` : primary
}

function getEventImage(event: Event) {
  return event.imageUrls?.[0] ?? event.imageUrl ?? event.image ?? null
}

function pickAmbientHeroEvent(events: Event[]) {
  const withImages = events.filter((event) => Boolean(getEventImage(event)))
  if (withImages.length === 0) {
    return null
  }

  return withImages.find((event) => event.isBoosted) ?? withImages[0]
}

function EventHostBadge({
  event,
  compact = false,
}: {
  event: Event
  compact?: boolean
}) {
  const organizerName =
    (typeof event.organizerName === "string" && event.organizerName.trim().length > 0
      ? event.organizerName.trim()
      : typeof event.organizer?.name === "string" && event.organizer.name.trim().length > 0
        ? event.organizer.name.trim()
        : "") || "Viao host"

  const organizerAvatar =
    (typeof event.organizerAvatarUrl === "string" && event.organizerAvatarUrl.trim().length > 0
      ? event.organizerAvatarUrl
      : typeof event.organizer?.avatarUrl === "string" && event.organizer.avatarUrl.trim().length > 0
        ? event.organizer.avatarUrl
        : null) ?? null

  const initial = organizerName.charAt(0).toUpperCase() || "V"

  return (
    <div className={`flex items-center gap-3 ${compact ? "text-xs" : "text-sm"} text-[#6f658b]`}>
      <div className={`${compact ? "h-8 w-8" : "h-10 w-10"} overflow-hidden rounded-full border border-[#ece5f2] bg-[#f7f5fb] shadow-[0_6px_14px_rgba(31,23,54,0.05)]`}>
        {organizerAvatar ? (
          <AppImage
            src={organizerAvatar}
            alt={organizerName}
            width={compact ? 32 : 40}
            height={compact ? 32 : 40}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#4f3fc1]">{initial}</div>
        )}
      </div>
      <div className="min-w-0">
        <div className={`${compact ? "text-[11px]" : "text-xs"} uppercase tracking-[0.16em] text-[#9186ab]`}>Hosted by</div>
        <div className="truncate font-medium text-[#443c61]">{organizerName}</div>
      </div>
    </div>
  )
}

function EventVisual({
  event,
  priority = false,
}: {
  event: Event
  priority?: boolean
}) {
  const image = getEventImage(event)
  const labelSource = event.category || event.title || "Viao"
  const badge = labelSource
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")

  if (image) {
    return (
      <AppImage
        src={image}
        alt={event.title}
        width={960}
        height={640}
        priority={priority}
        sizes="(min-width: 1280px) 28vw, (min-width: 768px) 40vw, 100vw"
        className="h-full w-full object-cover"
      />
    )
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,#ffffff,transparent_35%),linear-gradient(160deg,#f1ecfb,#e5deff_56%,#f7f5fc)]">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/80 bg-white/80 text-2xl font-semibold tracking-[0.16em] text-[#5948d1] shadow-[0_10px_26px_rgba(31,23,54,0.08)]">
        {badge || "V"}
      </div>
    </div>
  )
}

function EventPreviewCard({ event, onOpenEvent, priority = false }: EventPreviewCardProps) {
  return (
    <Card className={`h-full overflow-hidden ${glassCardClass}`} styles={{ body: { padding: 0 } }}>
      <div className="relative h-56 overflow-hidden bg-[#f3eefb]">
        <EventVisual event={event} priority={priority} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#201636]/70 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <Tag
            variant="filled"
            className="m-0 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ background: "rgba(255,255,255,0.84)", color: "#4338a6" }}
          >
            {event.category || "Featured"}
          </Tag>
          {event.isBoosted ? (
            <Tag
              variant="filled"
              className="m-0 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: "rgba(32,22,54,0.76)", color: "#ffffff" }}
            >
              Featured
            </Tag>
          ) : null}
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Typography.Title level={4} className="!mb-0 !text-[#24154b]">
              {event.title}
            </Typography.Title>
            <Typography.Paragraph className="!mb-0 line-clamp-2 !text-[15px] !leading-7 !text-[#6a5f8f]">
              {event.description}
            </Typography.Paragraph>
            <EventHostBadge event={event} />
          </div>
          <div className="rounded-2xl border border-[#ece5f2] bg-[#faf8fd] px-3 py-2 text-sm font-semibold text-[#4338a6]">
            {formatPriceChf(event.price)}
          </div>
        </div>

        <div className="grid gap-3 text-sm text-[#5b4f82] sm:grid-cols-2">
          <div className={`flex items-center gap-2 px-3 py-3 ${pillSurfaceClass}`}>
            <CalendarOutlined className="text-[#7c5cff]" />
            <span className="line-clamp-1">{formatEventMoment(event)}</span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-3 ${pillSurfaceClass}`}>
            <EnvironmentOutlined className="text-[#9d62ff]" />
            <span className="line-clamp-1">{describeLocation(event)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/50 pt-4">
          <Typography.Text className="!text-[#72669a]">
            {typeof event.attendeesCount === "number" && event.attendeesCount > 0
              ? `${event.attendeesCount} people already interested`
              : "See what matters fast and decide if it fits your plan"}
          </Typography.Text>
          <Button type="primary" onClick={() => onOpenEvent(event)} icon={<ArrowRightOutlined />}>
            View details
          </Button>
        </div>
      </div>
    </Card>
  )
}

function QuickLookItem({
  event,
  onOpenEvent,
}: {
  event: Event
  onOpenEvent: (event: Event) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenEvent(event)}
      className="w-full rounded-[24px] border border-[#ece5f2] bg-[#fbf9fd] p-4 text-left transition-all hover:border-[#d9d0eb] hover:shadow-[0_18px_40px_rgba(31,23,54,0.08)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Tag
              variant="filled"
              className="m-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ background: "rgba(95,67,229,0.10)", color: "#4f3fc1" }}
            >
              {event.category || "Event"}
            </Tag>
            {event.isBoosted ? (
              <span className="rounded-full border border-[#e8e1f2] bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5c5091]">
                Featured
              </span>
            ) : null}
          </div>
          <div className="line-clamp-2 text-base font-semibold leading-6 text-[#24154b]">{event.title}</div>
        </div>
        <div className="shrink-0 rounded-2xl border border-[#ece5f2] bg-white px-3 py-2 text-sm font-semibold text-[#4338a6]">
          {formatPriceChf(event.price)}
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-sm text-[#6a5f8f]">
        <EventHostBadge event={event} compact />
        <div className="flex items-center gap-2">
          <CalendarOutlined className="text-[#7c5cff]" />
          <span className="line-clamp-1">{formatEventMoment(event)}</span>
        </div>
        <div className="flex items-center gap-2">
          <EnvironmentOutlined className="text-[#9d62ff]" />
          <span className="line-clamp-1">{describeLocation(event)}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#f1ebff] pt-3 text-sm text-[#74679c]">
        <span>
          {typeof event.attendeesCount === "number" && event.attendeesCount > 0
            ? `${event.attendeesCount} people already interested`
            : "Check the details"}
        </span>
        <span className="font-semibold text-[#5f43e5]">Details</span>
      </div>
    </button>
  )
}

export default function HomePageClient({
  initialEvents,
  siteConfig,
  loadError,
}: {
  initialEvents: Event[]
  siteConfig: SiteConfig | null
  loadError?: string | null
}) {
  const router = useRouter()
  const { user, openAuthPage } = useAuth()
  const [query, setQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("ALL")
  const [activeIntent, setActiveIntent] = useState<IntentFilter>("ALL")

  const scrollToFeatured = () => {
    document.getElementById("featured")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  useEffect(() => {
    if (user) {
      router.replace(getDefaultAppPath(user.role))
    }
  }, [router, user])

  const openEventPage = (event: Event) => {
    router.push(`/event/${event.id}`)
  }

  const liveEvents = useMemo(() => {
    return initialEvents
      .filter((event) => !event.isCancelled)
      .slice()
      .sort((left, right) => getEventTimeValue(left) - getEventTimeValue(right))
  }, [initialEvents])

  const showcaseEvents = useMemo(() => {
    const polished = liveEvents.filter(isPresentableHomepageEvent)
    return polished.length >= Math.min(4, liveEvents.length) ? polished : liveEvents
  }, [liveEvents])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()

    for (const event of showcaseEvents) {
      const name = typeof event.category === "string" && event.category.trim().length > 0 ? event.category.trim() : "Other"
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count)
  }, [showcaseEvents])

  const filteredEvents = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase()

    return showcaseEvents
      .filter((event) => {
        switch (activeIntent) {
          case "TONIGHT":
            return isTonightEvent(event)
          case "THIS_WEEKEND":
            return isWeekendEvent(event)
          case "FREE":
            return (event.price ?? 0) === 0
          case "AFTER_WORK":
            return isAfterWorkEvent(event)
          case "ALL":
          default:
            return true
        }
      })
      .filter((event) => {
        if (activeCategory === "ALL") {
          return true
        }

        return (event.category ?? "").trim() === activeCategory
      })
      .filter((event) => {
        if (!loweredQuery) {
          return true
        }

        const searchable = [event.title, event.description, event.category, event.city, event.location]
          .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
          .join(" ")
          .toLowerCase()

        return searchable.includes(loweredQuery)
      })
  }, [activeCategory, activeIntent, query, showcaseEvents])

  const runwayEvents = filteredEvents.slice(0, 6)
  const quickLookEvents = (filteredEvents.length > 0 ? filteredEvents : showcaseEvents).slice(0, 2)
  const ambientHeroEvent = useMemo(() => {
    const pool = filteredEvents.length > 0 ? filteredEvents : showcaseEvents
    return pickAmbientHeroEvent(pool)
  }, [filteredEvents, showcaseEvents])
  const ambientHeroImage = ambientHeroEvent ? getEventImage(ambientHeroEvent) : null

  const categoryOptions = useMemo(() => {
    return [
      { label: "All", value: "ALL" },
      ...categories.slice(0, 5).map((category) => ({
        label: `${category.name} (${category.count})`,
        value: category.name,
      })),
    ]
  }, [categories])

  const cityShortcuts = useMemo(() => {
    return Array.from(
      new Set(
        showcaseEvents
          .map((event) => getLocationChipLabel(event))
          .filter((value): value is string => Boolean(value)),
      ),
    ).slice(0, 4)
  }, [showcaseEvents])

  const intentOptions = useMemo(() => {
    const options: Array<{ key: IntentFilter; label: string; count: number }> = [
      { key: "ALL", label: "All upcoming", count: showcaseEvents.length },
      { key: "TONIGHT", label: "Tonight", count: showcaseEvents.filter(isTonightEvent).length },
      { key: "THIS_WEEKEND", label: "This weekend", count: showcaseEvents.filter(isWeekendEvent).length },
      { key: "FREE", label: "Free", count: showcaseEvents.filter((event) => (event.price ?? 0) === 0).length },
      { key: "AFTER_WORK", label: "After work", count: showcaseEvents.filter(isAfterWorkEvent).length },
    ]

    return options.filter((option) => option.key === "ALL" || option.count > 0)
  }, [showcaseEvents])

  const resultSummary = useMemo(() => {
    const places = new Set(
      filteredEvents
        .map((event) => getLocationChipLabel(event))
        .filter((value): value is string => Boolean(value)),
    ).size

    if (filteredEvents.length === 0) {
      return "No events match this combination yet. Try a different city, category, or time filter."
    }

    const eventLabel = filteredEvents.length === 1 ? "event" : "events"
    const placeLabel = places === 1 ? "place" : "places"
    return `${filteredEvents.length} ${eventLabel} across ${places} ${placeLabel} worth checking right now.`
  }, [filteredEvents])

  const publicProofStats = useMemo(() => {
    const cityCount = new Set(
      showcaseEvents
        .map((event) => getLocationChipLabel(event))
        .filter((value): value is string => Boolean(value)),
    ).size
    const categoryCount = new Set(
      showcaseEvents
        .map((event) => (typeof event.category === "string" ? event.category.trim() : ""))
        .filter((value) => value.length > 0),
    ).size
    const freeCount = showcaseEvents.filter((event) => (event.price ?? 0) === 0).length
    const boostedCount = showcaseEvents.filter((event) => event.isBoosted).length

    return [
      {
        value: showcaseEvents.length,
        label: "Upcoming events",
        detail: "Live options already worth checking on VIAO.",
      },
      {
        value: cityCount,
        label: "Cities represented",
        detail: "Enough spread to make local browsing feel alive.",
      },
      {
        value: freeCount,
        label: "Free options",
        detail: "Useful for quick, low-friction decisions.",
      },
      {
        value: categoryCount || boostedCount,
        label: categoryCount > 0 ? "Categories represented" : "Featured picks",
        detail: categoryCount > 0 ? "Enough range to match different moods, budgets, and plans." : "Featured picks still need to feel worth showing up for.",
      },
    ]
  }, [showcaseEvents])

  useEffect(() => {
    if (typeof window === "undefined") return
    const eventId = new URLSearchParams(window.location.search).get("event")
    if (!eventId) return
    router.replace(`/event/${eventId}`)
  }, [router])

  if (user) {
    return null
  }

  return (
    <ConfigProvider theme={marketingTheme}>
      <div className={`${dmSans.className} min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#ffffff_0%,#faf8fc_32%,#ffffff_70%,#fbfafc_100%)] text-[#24154b]`}>
        <header className="sticky top-0 z-30 border-b border-[#ece5f2] bg-white/90 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
            <Link href="/" className="text-[#24154b] no-underline">
              <BrandLockup
                className="gap-2 sm:gap-3"
                iconSize={36}
                titleClassName="text-base sm:text-lg"
                subtitleClassName="hidden sm:block"
              />
            </Link>

            <nav className="hidden items-center gap-8 text-sm font-medium text-[#6d6297] md:flex">
              <a href="#featured" className="transition-colors hover:text-[#6f54ff]">
                Featured
              </a>
              <a href="#why-viao" className="transition-colors hover:text-[#6f54ff]">
                Why Viao
              </a>
              <a href="#join" className="transition-colors hover:text-[#6f54ff]">
                Join
              </a>
            </nav>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Button type="text" size="middle" onClick={() => openAuthPage("login")}>
                Sign in
              </Button>
              <Button type="primary" size="middle" onClick={() => openAuthPage("signup")}>
                Create account
              </Button>
            </div>
          </div>
        </header>

        {siteConfig?.maintenanceMode ? (
          <div className="mx-auto max-w-7xl px-6 pt-5">
            <Alert
              showIcon
              type="warning"
              message={siteConfig.announcement?.trim() || "The site is currently in maintenance mode."}
            />
          </div>
        ) : null}

        <main>
          <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-[-8%] top-[-8%] h-72 w-72 rounded-full bg-[#f3eef9] blur-3xl" />
              <div className="absolute right-[-4%] top-20 h-96 w-96 rounded-full bg-[#f5f0ff] blur-3xl" />
              <div className="absolute bottom-[-10%] left-1/3 h-64 w-64 rounded-full bg-[#eef6fb] blur-3xl" />
              {ambientHeroImage ? (
                <div className="absolute inset-y-10 right-[-10%] hidden w-[55%] min-w-[460px] max-w-[860px] lg:block" aria-hidden="true">
                  <div className="absolute inset-0 rounded-[54px] border border-white/40 bg-white/30 shadow-[0_24px_90px_rgba(101,73,214,0.12)] backdrop-blur-[2px]" />
                  <div
                    className="absolute inset-[18px] overflow-hidden rounded-[40px]"
                    style={{
                      WebkitMaskImage: "linear-gradient(270deg, rgba(0,0,0,1) 24%, rgba(0,0,0,0.72) 56%, rgba(0,0,0,0) 100%)",
                      maskImage: "linear-gradient(270deg, rgba(0,0,0,1) 24%, rgba(0,0,0,0.72) 56%, rgba(0,0,0,0) 100%)",
                    }}
                  >
                    <AppImage
                      src={ambientHeroImage}
                      alt=""
                      fill
                      priority
                      sizes="(min-width: 1280px) 42vw, 0px"
                      className="object-cover object-center opacity-[0.34] saturate-[0.92] scale-[1.08]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(270deg,rgba(255,255,255,0.08),rgba(255,255,255,0.38)_42%,rgba(255,255,255,0.96)_84%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,92,255,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.20))]" />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_420px] lg:items-start lg:gap-12 lg:py-16">
              <div className="relative z-10 min-w-0 lg:pt-6">
                <Tag
                  variant="filled"
                  className="mb-5 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em]"
                  style={{ background: "rgba(95,67,229,0.10)", color: "#5140bc" }}
                >
                  Local plans, without the digging
                </Tag>

                <h1 className={`${dmSerif.className} max-w-4xl text-5xl leading-[0.98] tracking-[-0.03em] text-[#24154b] sm:text-6xl lg:text-[4.6rem]`}>
                  Find local events worth showing up for.
                </h1>

                <Typography.Paragraph className="mt-6 max-w-2xl !text-lg !leading-8 !text-[#5f5678]">
                  Viao puts the time, place, price, and category up front so you can scan what is happening nearby and
                  decide fast.
                </Typography.Paragraph>

                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-[#5f5678]">
                  <span className="inline-flex items-center gap-2">
                    <ClockCircleOutlined className="text-[#6f54ff]" />
                    Time and price first
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <CompassOutlined className="text-[#6f54ff]" />
                    Search by city or category
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <HeartOutlined className="text-[#6f54ff]" />
                    Save and RSVP once you join
                  </span>
                </div>

                <div className="mt-7 max-w-2xl rounded-[30px] border border-[#e8e1f2] bg-white/96 p-5 shadow-[0_18px_42px_rgba(31,23,54,0.06)] sm:p-6">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                    <Input
                      size="large"
                      allowClear
                      value={query}
                      prefix={<SearchOutlined className="text-[#8b7cb6]" />}
                      placeholder="Search by city, category, or venue"
                      onChange={(event) => setQuery(event.target.value)}
                    />
                    <Button type="primary" size="large" onClick={scrollToFeatured}>
                      Browse events
                    </Button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {intentOptions.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setActiveIntent(option.key)}
                        className={`rounded-full border px-3 py-2 text-sm font-medium transition-all ${
                          activeIntent === option.key
                            ? "border-[#cdbdff] bg-[#f6f1ff] text-[#4f33d8]"
                            : "border-[#e8deff] bg-white text-[#5d5184] hover:border-[#cdbdff] hover:text-[#4f33d8]"
                        }`}
                      >
                        {option.label} ({option.count})
                      </button>
                    ))}
                  </div>
                  <Typography.Paragraph className="!mb-0 !mt-4 !text-sm !leading-7 !text-[#756c95]">
                    {resultSummary}
                  </Typography.Paragraph>
                </div>
              </div>

              <div className="relative z-10 min-w-0 lg:pt-2">
                <Card className={glassCardClass} styles={{ body: { padding: 0 } }}>
                  <div className="space-y-6 p-6">
                    <div>
                      <Typography.Text className="!text-xs !font-semibold !uppercase !tracking-[0.22em] !text-[#8a7ab6]">
                        Worth your time
                      </Typography.Text>
                      <Typography.Title level={2} className="!mb-2 !mt-2 !text-[2rem] !font-semibold !leading-tight !tracking-[-0.03em] !text-[#24154b]">
                        Start with the plans most likely to fit next.
                      </Typography.Title>
                      <Typography.Paragraph className="!mb-0 !text-[16px] !leading-8 !text-[#5f5678]">
                        A tighter shortlist for people choosing what to do next without digging through weak options.
                      </Typography.Paragraph>
                    </div>

                    {quickLookEvents.length > 0 ? (
                      <div className="space-y-4">
                        {quickLookEvents.map((event) => (
                          <div key={event.id}>
                            <QuickLookItem event={event} onOpenEvent={openEventPage} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty
                        description="New events will go live here as soon as organizers publish something worth checking."
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )}

                  </div>
                </Card>
              </div>
            </div>
          </section>

          <section id="featured" className="mx-auto max-w-7xl px-6 py-6 lg:py-10">
            <div className="rounded-[36px] border border-[#e9e2f0] bg-[radial-gradient(circle_at_top_left,#f8f4fb,transparent_26%),linear-gradient(180deg,#ffffff,#fcfbfd)] p-8 shadow-[0_22px_56px_rgba(31,23,54,0.06)] lg:p-10">
              <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <Typography.Text className="!text-xs !font-semibold !uppercase !tracking-[0.22em] !text-[#8a7ab6]">
                    Upcoming events
                  </Typography.Text>
                  <Typography.Title level={2} className="!mb-2 !mt-2 !text-4xl !font-semibold !tracking-[-0.03em] !text-[#24154b]">
                    Start with events that already make sense in one glance.
                  </Typography.Title>
                  <Typography.Paragraph className="!mb-0 !max-w-2xl !text-[16px] !leading-8 !text-[#5f5678]">
                    Start with events you can understand in one glance: what it is, where it happens, when it starts,
                    and whether it fits the plan.
                  </Typography.Paragraph>
                </div>
                <div className="rounded-full border border-[#ece5f2] bg-white px-4 py-2 text-sm font-medium text-[#6a5f8f]">
                  {runwayEvents.length} matching events right now
                </div>
              </div>

              <div className="mb-6 flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {categoryOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setActiveCategory(option.value)}
                      className={`rounded-full border px-3 py-2 text-sm font-medium transition-all ${
                        activeCategory === option.value
                          ? "border-[#cdbdff] bg-[#f6f1ff] text-[#4f33d8]"
                          : "border-[#e8e1f2] bg-white text-[#5d5184] hover:border-[#cdbdff] hover:text-[#4f33d8]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {cityShortcuts.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-[#72688f]">
                    <span className="font-medium">Popular cities:</span>
                    {cityShortcuts.map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          setActiveCategory("ALL")
                          setActiveIntent("ALL")
                          setQuery(city)
                        }}
                        className="rounded-full border border-[#e8e1f2] bg-[#fcfbfe] px-3 py-1.5 font-medium text-[#5d5184] transition-all hover:border-[#cdbdff] hover:text-[#4f33d8]"
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {loadError ? <Alert className="mb-6" showIcon type="error" message={loadError} /> : null}

              {runwayEvents.length === 0 ? (
                <Card className={glassCardClass}>
                  <Empty description="No events match this combination yet. Try a wider city, category, or time filter." />
                </Card>
              ) : (
                <div className="grid gap-6 lg:grid-cols-3">
                  {runwayEvents.map((event, index) => (
                    <EventPreviewCard key={event.id} event={event} onOpenEvent={openEventPage} priority={index === 0} />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section id="why-viao" className="mx-auto max-w-7xl px-6 pb-20 pt-16">
            <div className="grid gap-10 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] xl:items-start">
              <div className="space-y-8">
                <div className="max-w-3xl">
                  <Typography.Text className="!text-xs !font-semibold !uppercase !tracking-[0.22em] !text-[#8a7ab6]">
                    Trust the signal fast
                  </Typography.Text>
                  <Typography.Title level={2} className="!mb-4 !mt-2 !text-4xl !font-semibold !leading-tight !tracking-[-0.04em] !text-[#24154b]">
                    Enough signal to know what deserves your time.
                  </Typography.Title>
                  <Typography.Paragraph className="!mb-0 !text-[16px] !leading-8 !text-[#5f5678]">
                    VIAO works when the event lineup feels real and every plan is easy to judge on timing, place, price, and fit.
                  </Typography.Paragraph>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {publicProofStats.slice(0, 3).map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-[28px] border border-[#e8e1f2] bg-white px-5 py-6 shadow-[0_14px_32px_rgba(31,23,54,0.05)]"
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#887ab8]">{stat.label}</div>
                      <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#24154b]">{stat.value}</div>
                      <div className="mt-2 text-sm leading-7 text-[#655c80]">{stat.detail}</div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[28px] border border-[#e8e1f2] bg-[linear-gradient(180deg,#ffffff,#fcfafc)] px-6 py-6 shadow-[0_14px_32px_rgba(31,23,54,0.05)]">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f2edff] text-sm font-semibold text-[#5948d1]">
                        1
                      </div>
                      <div>
                        <div className="text-lg font-semibold tracking-[-0.02em] text-[#24154b]">
                          Everything needed for a fast yes-or-no
                        </div>
                        <div className="mt-2 text-sm leading-7 text-[#655c80]">
                          Time, place, price, and host should be clear right away.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-[#e8e1f2] bg-[linear-gradient(180deg,#ffffff,#fcfafc)] px-6 py-6 shadow-[0_14px_32px_rgba(31,23,54,0.05)]">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef7f4] text-sm font-semibold text-[#1f8f73]">
                        2
                      </div>
                      <div>
                        <div className="text-lg font-semibold tracking-[-0.02em] text-[#24154b]">
                          Save the plans that become real
                        </div>
                        <div className="mt-2 text-sm leading-7 text-[#655c80]">
                          Saving, RSVPing, and messaging organizers matter once a plan moves from maybe to yes.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Card
                id="join"
                className="overflow-hidden border !border-[#e8e1f2] shadow-[0_24px_60px_rgba(31,23,54,0.08)]"
                styles={{ body: { padding: 0, background: "#ffffff" } }}
                style={{ background: "#ffffff" }}
              >
                <div className="space-y-8 bg-[radial-gradient(circle_at_top_left,#f6f0fb,transparent_24%),radial-gradient(circle_at_bottom_right,#eef7fb,transparent_28%),linear-gradient(180deg,#ffffff,#fbf9fc)] px-8 py-9 lg:px-10 lg:py-10">
                  <div>
                    <Typography.Text className="!text-xs !font-semibold !uppercase !tracking-[0.22em] !text-[#887ab8]">
                      Join Viao
                    </Typography.Text>
                    <Typography.Title level={2} className="!mb-4 !mt-3 !text-4xl !font-semibold !leading-tight !tracking-[-0.04em] !text-[#24154b]">
                      Keep the plans you want to come back to.
                    </Typography.Title>
                    <Typography.Paragraph className="!mb-0 !text-[16px] !leading-8 !text-[#5f5678]">
                      VIAO gets better once a plan becomes real: save it, RSVP, and keep the conversation moving with organizers.
                    </Typography.Paragraph>
                  </div>

                  <div className="grid gap-4">
                    {joinBenefitItems.map(({ icon: Icon, label }) => (
                      <div
                        key={label}
                        className="flex items-center gap-4 border-b border-[#ece5f2] pb-4 last:border-b-0 last:pb-0"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[18px] text-[#5948d1] shadow-[0_10px_20px_rgba(31,23,54,0.06)]">
                          <Icon />
                        </div>
                        <div className="text-[15px] font-medium leading-7 text-[#453d61] sm:text-base">{label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[28px] border border-[#e8e1f2] bg-white/94 p-5 shadow-[0_16px_32px_rgba(31,23,54,0.06)]">
                    <div className="space-y-3 text-sm text-[#5d5478]">
                      <div className="flex items-center gap-3">
                        <CalendarOutlined className="text-[#5948d1]" />
                        Personal event shortlist
                      </div>
                      <div className="flex items-center gap-3">
                        <HeartOutlined className="text-[#5948d1]" />
                        RSVP and reminder-ready
                      </div>
                      <div className="flex items-center gap-3">
                        <MessageOutlined className="text-[#5948d1]" />
                        Direct organizer messaging
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      <Button type="primary" size="large" block onClick={() => openAuthPage("signup")}>
                        Create your account
                      </Button>
                      <Button size="large" block ghost onClick={() => openAuthPage("login")}>
                        I already have an account
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </ConfigProvider>
  )
}
