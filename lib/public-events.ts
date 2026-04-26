import { Prisma, RsvpStatus } from "@prisma/client"
import { unstable_cache } from "next/cache"

import { prisma } from "@/lib/prisma"
import { eventCardSelect, mapEventCardForClient, sortEventsForFeed } from "@/lib/event-response"
import type { Event } from "@/types/event"

const DEFAULT_PUBLIC_EVENT_LIMIT = 24

export const publicEventCardSelect = Prisma.validator<Prisma.EventSelect>()({
  ...eventCardSelect,
  _count: {
    select: {
      rsvps: {
        where: { status: RsvpStatus.GOING },
      },
    },
  },
})

type PublicEventCardRecord = Prisma.EventGetPayload<{
  select: typeof publicEventCardSelect
}>

export function buildUpcomingPublishedEventWhere(now = new Date()): Prisma.EventWhereInput {
  return {
    status: "PUBLISHED",
    isCancelled: false,
    OR: [
      { endsAt: { gte: now } },
      { endsAt: null, date: { gte: now } },
    ],
  }
}

function mapPublicEvent(event: PublicEventCardRecord) {
  return mapEventCardForClient(event, {
    attendeesCount: event._count.rsvps,
  })
}

const getCachedPublicEvents = unstable_cache(
  async () => {
    const events = await prisma.event.findMany({
      where: buildUpcomingPublishedEventWhere(),
      orderBy: { date: "asc" },
      take: DEFAULT_PUBLIC_EVENT_LIMIT,
      select: publicEventCardSelect,
    })

    return sortEventsForFeed(events.map((event) => mapPublicEvent(event)))
  },
  ["public-events-v2"],
  { revalidate: 60 },
)

const getCachedPublicEventById = unstable_cache(
  async (id: string) => {
    const event = await prisma.event.findFirst({
      where: {
        id,
        ...buildUpcomingPublishedEventWhere(),
      },
      select: publicEventCardSelect,
    })

    return event ? mapPublicEvent(event) : null
  },
  ["public-event-by-id-v2"],
  { revalidate: 60 },
)

export async function listPublicEvents(limit = DEFAULT_PUBLIC_EVENT_LIMIT): Promise<Event[]> {
  const events = await getCachedPublicEvents()
  return events.slice(0, Math.max(1, limit))
}

export async function getPublicEventById(id: string, _sessionUserId?: string): Promise<Event | null> {
  return getCachedPublicEventById(id)
}
