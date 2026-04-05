import { EventStatus, RsvpStatus } from "@prisma/client"

import type { EventRsvpStatus } from "@/types/event"

export function toPrismaEventStatus(status?: "DRAFT" | "PUBLISHED" | null): EventStatus | undefined {
  if (!status) return undefined
  return status === "DRAFT" ? EventStatus.DRAFT : EventStatus.PUBLISHED
}

export function toPrismaRsvpStatus(status?: EventRsvpStatus | null): RsvpStatus | undefined {
  if (!status) return undefined
  switch (status) {
    case "MAYBE":
      return RsvpStatus.MAYBE
    case "NOT_GOING":
      return RsvpStatus.NOT_GOING
    default:
      return RsvpStatus.GOING
  }
}
