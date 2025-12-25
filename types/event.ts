export interface Event {
  id: string
  title: string
  description: string
  date: string // ISO
  time?: string
  location: string
  category: string
  imageUrl?: string | null
  price?: number | null
  isBoosted: boolean
  boostUntil?: string | null
  maxAttendees?: number | null
  organizerId: string
  organizerName?: string
  attendeesCount?: number
  isGoing?: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateEventData {
  title: string
  description: string
  date: string // ISO
  time?: string
  location: string
  category: string
  imageUrl?: string
  price?: number | null
  maxAttendees?: number | null
  isBoosted?: boolean
  boostUntil?: string | null
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
