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
  createEvent: (data: CreateEventData) => Promise<void>
  updateEvent: (id: string, data: Partial<Event>) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  setFilters: (filters: EventFilters) => void
  refreshEvents: () => Promise<void>
  boostEvent: (id: string) => Promise<void>
  rsvpEvent: (id: string) => Promise<void>
  cancelRsvp: (id: string) => Promise<void>
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
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    date: event.date,
    time: event.time,
    location: event.location,
    category: event.category,
    imageUrl: event.imageUrl ?? null,
    price: event.price ?? null,
    isBoosted: event.isBoosted,
    boostUntil: event.boostUntil ?? null,
    maxAttendees: event.maxAttendees ?? null,
    organizerId: event.organizerId,
    organizerName: event.organizerName,
    attendeesCount: event.attendeesCount ?? 0,
    isGoing: event.isGoing ?? false,
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
      const eventDate = new Date(event.date)
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
      setEvents((prev) => [mapEvent(res.event), ...prev])
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

  const boostEvent = async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await handleJson<{ event: Event }>(fetch(`/api/events/${id}/boost`, { method: "POST", credentials: "include" }))
      setEvents((prev) => prev.map((e) => (e.id === id ? mapEvent(res.event) : e)))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to boost event"
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
    boostEvent,
    rsvpEvent,
    cancelRsvp,
  }

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
}
