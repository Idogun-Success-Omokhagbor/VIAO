import { Prisma } from "@prisma/client"

import type { Event as ApiEvent } from "@/types/event"

import { toEventImageUrl, toEventImageUrls } from "@/lib/image-utils"

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

export function mapEventForClient(event: EventWithClientRelations, sessionUserId?: string): ApiEvent {
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
  const rsvp = sessionUserId ? (event.rsvps.find((entry) => entry.userId === sessionUserId) ?? null) : null
  const isSaved = sessionUserId ? event.saves.some((entry) => entry.userId === sessionUserId) : false
  const attendeesCount = event.rsvps.filter((entry) => entry.status === "GOING").length

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
    isGoing: rsvp ? rsvp.status === "GOING" : false,
    rsvpStatus: rsvp?.status ?? null,
    isSaved,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  }
}
