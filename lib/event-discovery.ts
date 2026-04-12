import { getLocationString } from "@/lib/utils"
import type { Event } from "@/types/event"

export type SortOption = "recommended" | "date" | "popularity" | "price"
export type QuickFilter = "all" | "for-you" | "nearby" | "free" | "weekend" | "popular"

export const quickFilterOptions: Array<{ id: QuickFilter; label: string }> = [
  { id: "all", label: "All upcoming" },
  { id: "for-you", label: "For you" },
  { id: "nearby", label: "Nearby" },
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

export function compareRecommendedEvents(a: Event, b: Event, userInterests: string[], userLocation: string) {
  const aInterest = eventMatchesInterest(a, userInterests)
  const bInterest = eventMatchesInterest(b, userInterests)
  if (aInterest !== bInterest) return aInterest ? -1 : 1

  const aNearby = eventMatchesLocation(a, userLocation)
  const bNearby = eventMatchesLocation(b, userLocation)
  if (aNearby !== bNearby) return aNearby ? -1 : 1

  const popularityDelta = (b.attendeesCount ?? 0) - (a.attendeesCount ?? 0)
  if (popularityDelta !== 0) return popularityDelta

  return getEventTimestamp(a) - getEventTimestamp(b)
}

export function compareExploreEvents(
  a: Event,
  b: Event,
  sortBy: SortOption,
  userInterests: string[],
  userLocation: string,
) {
  const aInterest = eventMatchesInterest(a, userInterests)
  const bInterest = eventMatchesInterest(b, userInterests)
  const aNearby = eventMatchesLocation(a, userLocation)
  const bNearby = eventMatchesLocation(b, userLocation)

  switch (sortBy) {
    case "recommended":
      return compareRecommendedEvents(a, b, userInterests, userLocation)
    case "date":
      if (aInterest !== bInterest) return aInterest ? -1 : 1
      return getEventTimestamp(a) - getEventTimestamp(b)
    case "popularity":
      if (aInterest !== bInterest) return aInterest ? -1 : 1
      if (aNearby !== bNearby) return aNearby ? -1 : 1
      return (b.attendeesCount ?? 0) - (a.attendeesCount ?? 0)
    case "price":
      if (aInterest !== bInterest) return aInterest ? -1 : 1
      return (a.price ?? 0) - (b.price ?? 0)
    default:
      return 0
  }
}

export function eventMatchesInterest(event: Event, userInterests: string[]) {
  if (userInterests.length === 0) return false
  const haystack = `${event.category} ${event.title} ${event.description}`.toLowerCase()
  return userInterests.some((interest) => haystack.includes(interest))
}

export function eventMatchesLocation(event: Event, userLocation: string) {
  const location = userLocation.trim().toLowerCase()
  if (!location) return false

  const locationRoot = location.split(",")[0]?.trim() || location
  const haystack = `${event.city ?? ""} ${event.venue ?? ""} ${event.address ?? ""} ${getLocationString(event.location)}`.toLowerCase()
  return haystack.includes(locationRoot)
}

export function isWeekendEvent(event: Event) {
  const day = new Date(event.startsAt ?? event.date).getDay()
  return day === 5 || day === 6 || day === 0
}

export function isUpcomingEvent(event: Event) {
  if (event.isCancelled) return false
  const startsAt = getEventTimestamp(event)
  return Number.isFinite(startsAt) && startsAt >= Date.now() - 2 * 60 * 60 * 1000
}

export function getEventTimestamp(event: Event) {
  const timestamp = new Date(event.startsAt ?? event.date).getTime()
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp
}

export function formatEventDateLabel(event: Event) {
  return dateFormatter.format(new Date(event.startsAt ?? event.date))
}

export function formatEventTimeLabel(event: Event) {
  if (event.time?.trim()) return event.time
  const date = new Date(event.startsAt ?? event.date)
  return Number.isNaN(date.getTime()) ? "Time TBC" : timeFormatter.format(date)
}

export function formatRelativeEventLabel(event: Event) {
  const date = new Date(event.startsAt ?? event.date)
  if (Number.isNaN(date.getTime())) return "Coming up"

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const days = Math.round((target.getTime() - today.getTime()) / 86400000)

  if (days <= 0) return "Today"
  if (days === 1) return "Tomorrow"
  if (days < 7) return `${days} days away`
  return shortDateFormatter.format(date)
}

export function getPlanStatusLabel(event: Event) {
  if (event.rsvpStatus === "GOING") return "Going"
  if (event.rsvpStatus === "MAYBE") return "Maybe"
  if (event.isSaved) return "Saved"
  return "Planned"
}

export function getRecommendationReason(event: Event, userInterests: string[], userLocation: string) {
  if (eventMatchesInterest(event, userInterests) && eventMatchesLocation(event, userLocation)) {
    return "Your kind of plan nearby"
  }
  if (eventMatchesInterest(event, userInterests)) {
    return "Your kind of event"
  }
  if (eventMatchesLocation(event, userLocation)) {
    return "Happening near you"
  }
  if ((event.attendeesCount ?? 0) >= 12) {
    return "Drawing a crowd"
  }
  return "Worth opening"
}

export function isPlannedEvent(event: Event) {
  return Boolean(event.isSaved || event.rsvpStatus === "GOING" || event.rsvpStatus === "MAYBE")
}

export function getDiscoverLocationLabel(location: string) {
  const value = location.trim()
  if (!value) return "your wider area"

  const normalized = value.toLowerCase()
  if (swissCityKeywords.some((keyword) => normalized.includes(keyword))) {
    return value
  }

  const segments = value
    .split(/[,-]/)
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (segments.length > 0) {
    return segments[0]
  }

  return value
}

export function haveSameEntries(left: string[], right: string[]) {
  if (left.length !== right.length) return false

  const normalizedLeft = [...left].map((value) => value.trim().toLowerCase()).sort()
  const normalizedRight = [...right].map((value) => value.trim().toLowerCase()).sort()

  return normalizedLeft.every((value, index) => value === normalizedRight[index])
}
