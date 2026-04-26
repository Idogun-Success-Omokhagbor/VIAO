import { Prisma } from "@prisma/client"

import type { Event as ApiEvent } from "@/types/event"

import { toEventImageUrl, toEventImageUrls } from "@/lib/image-utils"

export const eventCardSelect = Prisma.validator<Prisma.EventSelect>()({
  id: true,
  title: true,
  description: true,
  date: true,
  timeLabel: true,
  location: true,
  startsAt: true,
  endsAt: true,
  city: true,
  venue: true,
  address: true,
  lat: true,
  lng: true,
  status: true,
  isCancelled: true,
  cancelledAt: true,
  category: true,
  imageUrl: true,
  imageUrls: true,
  price: true,
  isBoosted: true,
  boostLevel: true,
  boostUntil: true,
  maxAttendees: true,
  organizerId: true,
  organizer: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
    },
  },
  createdAt: true,
  updatedAt: true,
})

export const eventClientInclude = Prisma.validator<Prisma.EventInclude>()({
  organizer: {
    select: {
      id: true,
      name: true,
      avatarUrl: true,
    },
  },
  rsvps: {
    select: {
      userId: true,
      status: true,
    },
  },
  saves: {
    select: {
      userId: true,
    },
  },
})

export type EventCardRecord = Prisma.EventGetPayload<{
  select: typeof eventCardSelect
}>

export type EventWithClientRelations = Prisma.EventGetPayload<{
  include: typeof eventClientInclude
}>

export function sortEventsForFeed(events: ApiEvent[]): ApiEvent[] {
  return [...events].sort((a, b) => {
    const aLevel = typeof a.boostLevel === "number" ? a.boostLevel : 0
    const bLevel = typeof b.boostLevel === "number" ? b.boostLevel : 0

    if (aLevel !== bLevel) return bLevel - aLevel

    const aUntil = typeof a.boostUntil === "string" ? new Date(a.boostUntil).getTime() : Number.NEGATIVE_INFINITY
    const bUntil = typeof b.boostUntil === "string" ? new Date(b.boostUntil).getTime() : Number.NEGATIVE_INFINITY
    if (aUntil !== bUntil) return bUntil - aUntil

    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })
}

export function mapEventCardForClient(
  event: EventCardRecord,
  extras?: {
    attendeesCount?: number
    isSaved?: boolean
    rsvpStatus?: ApiEvent["rsvpStatus"]
  },
): ApiEvent {
  const safeImageUrl = toEventImageUrl(event.id, event.imageUrl)
  const safeImageUrls = toEventImageUrls(event.id, event.imageUrls, safeImageUrl)
  const isBoostExpired = event.boostUntil ? event.boostUntil.getTime() <= Date.now() : false
  const storedBoostLevel = typeof event.boostLevel === "number" ? event.boostLevel : null
  const effectiveBoostLevel = isBoostExpired
    ? 0
    : storedBoostLevel && storedBoostLevel > 0
      ? storedBoostLevel
      : event.isBoosted
        ? 1
        : 0
  const rsvpStatus = extras?.rsvpStatus ?? null
  const isSaved = extras?.isSaved === true
  const attendeesCount = typeof extras?.attendeesCount === "number" ? extras.attendeesCount : undefined

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date.toISOString(),
    time: event.timeLabel ?? undefined,
    location: event.location,
    startsAt: event.startsAt ? event.startsAt.toISOString() : null,
    endsAt: event.endsAt ? event.endsAt.toISOString() : null,
    city: event.city ?? null,
    venue: event.venue ?? null,
    address: event.address ?? null,
    lat: event.lat ?? null,
    lng: event.lng ?? null,
    status: event.status,
    isCancelled: event.isCancelled,
    cancelledAt: event.cancelledAt ? event.cancelledAt.toISOString() : null,
    category: event.category,
    imageUrl: safeImageUrl,
    imageUrls: safeImageUrls,
    price: event.price ?? null,
    isBoosted: isBoostExpired ? false : event.isBoosted,
    boostLevel: effectiveBoostLevel,
    boostUntil: isBoostExpired ? null : event.boostUntil ? event.boostUntil.toISOString() : null,
    maxAttendees: event.maxAttendees ?? null,
    organizerId: event.organizerId,
    organizerName: event.organizer.name,
    organizerAvatarUrl: event.organizer.avatarUrl ?? null,
    attendeesCount,
    isGoing: rsvpStatus === "GOING",
    rsvpStatus,
    isSaved,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  }
}

export function mapEventForClient(event: EventWithClientRelations, sessionUserId?: string): ApiEvent {
  const rsvp = sessionUserId ? (event.rsvps.find((entry) => entry.userId === sessionUserId) ?? null) : null
  const isSaved = sessionUserId ? event.saves.some((entry) => entry.userId === sessionUserId) : false
  const attendeesCount = event.rsvps.filter((entry) => entry.status === "GOING").length

  return mapEventCardForClient(event, {
    attendeesCount,
    isSaved,
    rsvpStatus: rsvp?.status ?? null,
  })
}
