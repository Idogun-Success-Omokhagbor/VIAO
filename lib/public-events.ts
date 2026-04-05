import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { eventClientInclude, mapEventForClient, sortEventsForFeed } from "@/lib/event-response"
import type { Event } from "@/types/event"

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

export async function listPublicEvents(limit = 60): Promise<Event[]> {
  const events = await prisma.event.findMany({
    where: buildUpcomingPublishedEventWhere(),
    orderBy: { date: "asc" },
    take: limit,
    include: eventClientInclude,
  })

  return sortEventsForFeed(events.map((event) => mapEventForClient(event)))
}

export async function getPublicEventById(id: string, sessionUserId?: string): Promise<Event | null> {
  const event = await prisma.event.findFirst({
    where: {
      id,
      ...buildUpcomingPublishedEventWhere(),
    },
    include: eventClientInclude,
  })

  if (!event) {
    return null
  }

  return mapEventForClient(event, sessionUserId)
}
