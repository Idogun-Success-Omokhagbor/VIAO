export interface Event {
  id: string
  title: string
  description: string
  date: string // ISO
  time?: string
  location: string
  attendees?: any
  image?: any
  organizer?: any
  userId?: any
  boostedUntil?: any
  boostCount?: any
  rsvpList?: any
  startsAt?: string | null
  endsAt?: string | null
  city?: string | null
  venue?: string | null
  address?: string | null
  lat?: number | null
  lng?: number | null
  status?: "DRAFT" | "PUBLISHED"
  isCancelled?: boolean
  cancelledAt?: string | null
  category: string
  imageUrl?: string | null
  imageUrls?: string[]
  price?: number | null
  isBoosted: boolean
  boostLevel?: number
  boostUntil?: string | null
  maxAttendees?: number | null
  organizerId: string
  organizerName?: string
  organizerAvatarUrl?: string | null
  attendeesCount?: number
  isGoing?: boolean
  rsvpStatus?: "GOING" | "MAYBE" | "NOT_GOING" | null
  isSaved?: boolean
  createdAt: any
  updatedAt: any
}

export interface CreateEventData {
  title: string
  description: string
  date: string // ISO (legacy fallback)
  time?: string // legacy fallback
  location: string // legacy fallback
  startsAt?: string | null
  endsAt?: string | null
  city?: string | null
  venue?: string | null
  address?: string | null
  lat?: number | null
  lng?: number | null
  category: string
  imageUrl?: string
  imageUrls?: string[]
  price?: number | null
  maxAttendees?: number | null
  isBoosted?: boolean
  boostUntil?: string | null
  status?: "DRAFT" | "PUBLISHED"
}

export interface EventFilters {
  category?: string
  location?: string
  isFree?: boolean
  isOnline?: boolean
  tags?: string[]
  dateRange?: { start: Date; end: Date }
  priceRange?: { min: number; max: number }
}
