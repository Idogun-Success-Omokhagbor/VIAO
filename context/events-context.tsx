"use client"

import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react"
import type { Event, CreateEventData, EventFilters } from "@/types/event"

interface EventsContextType {
  events: Event[]
  filteredEvents: Event[]
  filters: EventFilters
  isLoading: boolean
  error: string | null
  addEvent: (event: Event) => void
  createEvent: (data: CreateEventData) => Promise<Event>
  updateEvent: (id: string, data: Partial<Event>) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  setFilters: (filters: EventFilters) => void
  refreshEvents: () => Promise<void>
  rsvpEvent: (id: string) => Promise<void>
  setRsvpStatus: (id: string, status: "GOING" | "MAYBE" | "NOT_GOING") => Promise<void>
  cancelRsvp: (id: string) => Promise<void>
  saveEvent: (id: string) => Promise<void>
  unsaveEvent: (id: string) => Promise<void>
  reportEvent: (id: string, reason: string, details?: string) => Promise<void>
}

const EventsContext = createContext<EventsContextType | undefined>(undefined)

export function useEvents() {
  const context = useContext(EventsContext)
  if (!context) {
    throw new Error("useEvents must be used within an EventsProvider")
  }
  return context
}

interface EventsProviderProps {
  children: ReactNode
}

async function handleJson<T>(resPromise: Promise<Response> | Response): Promise<T> {
  const res = await resPromise
  if (!res.ok) {
    let message = "Request failed"
    try {
      const data = await res.json()
      message = data.error || message
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

function mapEvent(event: any): Event {
  const safeImageUrl =
    typeof event.imageUrl === "string" && event.imageUrl.startsWith("data:")
      ? `/api/events/${event.id}/image`
      : (event.imageUrl ?? null)
  const safeImageUrls = Array.isArray(event.imageUrls)
    ? event.imageUrls
        .map((u: unknown, idx: number) =>
          typeof u === "string" && u.startsWith("data:") ? `/api/events/${event.id}/image?index=${idx}` : u,
        )
        .filter((u: unknown) => typeof u === "string" && u.length > 0)
    : safeImageUrl
      ? [safeImageUrl]
      : []
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date,
    time: event.time,
    location: event.location,
    startsAt: event.startsAt ?? null,
    endsAt: event.endsAt ?? null,
    city: event.city ?? null,
    venue: event.venue ?? null,
    address: event.address ?? null,
    lat: event.lat ?? null,
    lng: event.lng ?? null,
    status: event.status ?? "PUBLISHED",
    isCancelled: event.isCancelled ?? false,
    cancelledAt: event.cancelledAt ?? null,
    category: event.category,
    imageUrl: safeImageUrl,
    imageUrls: safeImageUrls,
    price: event.price ?? null,
    isBoosted: event.isBoosted,
    boostLevel: typeof event.boostLevel === "number" ? event.boostLevel : event.isBoosted ? 1 : 0,
    boostUntil: event.boostUntil ?? null,
    maxAttendees: event.maxAttendees ?? null,
    organizerId: event.organizerId,
    organizerName: event.organizerName,
    organizerAvatarUrl: event.organizerAvatarUrl ?? null,
    attendeesCount: event.attendeesCount ?? 0,
    isGoing: event.isGoing ?? false,
    rsvpStatus: event.rsvpStatus ?? null,
    isSaved: event.isSaved ?? false,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  }
}

export function EventsProvider({ children }: EventsProviderProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [filters, setFilters] = useState<EventFilters>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshEvents = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await handleJson<{ events: Event[] }>(
        fetch("/api/events", { cache: "no-store", credentials: "include" }),
      )
      setEvents(data.events.map(mapEvent))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch events"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshEvents()
  }, [refreshEvents])

  const filteredEvents = events.filter((event) => {
    if (filters.category && event.category !== filters.category) return false
    if (filters.location && !event.location.toLowerCase().includes(filters.location.toLowerCase())) return false
    if (filters.isFree && (event.price ?? 0) > 0) return false

    if (filters.dateRange) {
      const eventDate = new Date(event.startsAt ?? event.date)
      if (eventDate < filters.dateRange.start || eventDate > filters.dateRange.end) return false
    }

    if (filters.priceRange) {
      const price = event.price ?? 0
      if (price < filters.priceRange.min || price > filters.priceRange.max) return false
    }

    return true
  })

  const addEvent = (event: Event) => {
    setEvents((prev) => [event, ...prev])
  }

  const createEvent = async (data: CreateEventData) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await handleJson<{ event: Event }>(
        fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        }),
      )
      const created = mapEvent(res.event)
      setEvents((prev) => [created, ...prev])
      return created
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create event"
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const updateEvent = async (id: string, data: Partial<Event>) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await handleJson<{ event: Event }>(
        fetch(`/api/events/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        }),
      )
      setEvents((prev) => prev.map((e) => (e.id === id ? mapEvent(res.event) : e)))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update event"
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const deleteEvent = async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await handleJson(fetch(`/api/events/${id}`, { method: "DELETE", credentials: "include" }))
      setEvents((prev) => prev.filter((e) => e.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete event"
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const rsvpEvent = async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await handleJson<{ event: Event }>(
        fetch(`/api/events/${id}/rsvp`, { method: "POST", credentials: "include" }),
      )
      setEvents((prev) => prev.map((e) => (e.id === id ? mapEvent(res.event) : e)))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to RSVP"
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const setRsvpStatus = async (id: string, status: "GOING" | "MAYBE" | "NOT_GOING") => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await handleJson<{ event: Event }>(
        fetch(`/api/events/${id}/rsvp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status }),
        }),
      )
      setEvents((prev) => prev.map((e) => (e.id === id ? mapEvent(res.event) : e)))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update RSVP"
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const cancelRsvp = async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await handleJson<{ event: Event }>(
        fetch(`/api/events/${id}/rsvp`, { method: "DELETE", credentials: "include" }),
      )
      setEvents((prev) => prev.map((e) => (e.id === id ? mapEvent(res.event) : e)))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to cancel RSVP"
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const saveEvent = async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await handleJson<{ event: Event }>(fetch(`/api/events/${id}/save`, { method: "POST", credentials: "include" }))
      setEvents((prev) => prev.map((e) => (e.id === id ? mapEvent(res.event) : e)))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save event"
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const unsaveEvent = async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await handleJson<{ event: Event }>(fetch(`/api/events/${id}/save`, { method: "DELETE", credentials: "include" }))
      setEvents((prev) => prev.map((e) => (e.id === id ? mapEvent(res.event) : e)))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to unsave event"
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const reportEvent = async (id: string, reason: string, details?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await handleJson(fetch(`/api/events/${id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason, details }),
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to report event"
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const value: EventsContextType = {
    events,
    filteredEvents,
    filters,
    isLoading,
    error,
    addEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    setFilters,
    refreshEvents,
    rsvpEvent,
    setRsvpStatus,
    cancelRsvp,
    saveEvent,
    unsaveEvent,
    reportEvent,
  }

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
}
