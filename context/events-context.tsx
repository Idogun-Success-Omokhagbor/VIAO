"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Event, CreateEventData, EventFilters } from "@/types/event"

interface EventsContextType {
  events: Event[]
  filteredEvents: Event[]
  filters: EventFilters
  isLoading: boolean
  error: string | null
  createEvent: (data: CreateEventData) => Promise<void>
  updateEvent: (id: string, data: Partial<Event>) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  setFilters: (filters: EventFilters) => void
  refreshEvents: () => Promise<void>
  boostEvent: (id: string) => Promise<void>
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

export function EventsProvider({ children }: EventsProviderProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [filters, setFilters] = useState<EventFilters>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mock data
  const mockEvents: Event[] = [
    {
      id: "1",
      title: "Tech Meetup Zurich",
      description: "Join us for an evening of tech talks and networking",
      category: "Technology",
      location: "Zurich, Switzerland",
      date: new Date("2024-12-20T18:00:00"),
      time: "18:00",
      price: 0,
      currentAttendees: 45,
      maxAttendees: 100,
      imageUrl: "/tech-startup-meetup-networking.png",
      organizerId: "org1",
      organizer: {
        id: "org1",
        name: "Tech Community Zurich",
        verified: true,
      },
      tags: ["networking", "technology", "startup"],
      isBoosted: false,
      isOnline: false,
      createdAt: new Date("2024-12-01"),
      updatedAt: new Date("2024-12-01"),
    },
    {
      id: "2",
      title: "Art Gallery Opening",
      description: "Contemporary art exhibition featuring local artists",
      category: "Arts & Culture",
      location: "Geneva, Switzerland",
      date: new Date("2024-12-21T19:00:00"),
      time: "19:00",
      price: 15,
      currentAttendees: 32,
      maxAttendees: 80,
      imageUrl: "/art-gallery-opening.png",
      organizerId: "org2",
      organizer: {
        id: "org2",
        name: "Geneva Arts Center",
        verified: true,
      },
      tags: ["art", "culture", "exhibition"],
      isBoosted: true,
      isOnline: false,
      createdAt: new Date("2024-12-02"),
      updatedAt: new Date("2024-12-02"),
    },
    {
      id: "3",
      title: "Alpine Hiking Adventure",
      description: "Guided hiking tour through the Swiss Alps",
      category: "Sports & Outdoors",
      location: "Interlaken, Switzerland",
      date: new Date("2024-12-22T08:00:00"),
      time: "08:00",
      price: 35,
      currentAttendees: 18,
      maxAttendees: 25,
      imageUrl: "/forest-trail-hike-group.png",
      organizerId: "org3",
      organizer: {
        id: "org3",
        name: "Alpine Adventures",
        verified: false,
      },
      tags: ["hiking", "nature", "adventure"],
      isBoosted: false,
      isOnline: false,
      createdAt: new Date("2024-12-03"),
      updatedAt: new Date("2024-12-03"),
    },
  ]

  useEffect(() => {
    setEvents(mockEvents)
  }, [])

  const filteredEvents = events.filter((event) => {
    if (filters.category && event.category !== filters.category) return false
    if (filters.location && !event.location.toString().toLowerCase().includes(filters.location.toLowerCase()))
      return false
    if (filters.isFree && event.price > 0) return false
    if (filters.isOnline !== undefined && event.isOnline !== filters.isOnline) return false
    if (filters.tags && !filters.tags.some((tag) => event.tags.includes(tag))) return false

    if (filters.dateRange) {
      const eventDate = new Date(event.date)
      if (eventDate < filters.dateRange.start || eventDate > filters.dateRange.end) return false
    }

    if (filters.priceRange) {
      if (event.price < filters.priceRange.min || event.price > filters.priceRange.max) return false
    }

    return true
  })

  const createEvent = async (data: CreateEventData) => {
    setIsLoading(true)
    setError(null)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API call

      const newEvent: Event = {
        id: Date.now().toString(),
        ...data,
        currentAttendees: 0,
        organizerId: "current-user",
        organizer: {
          id: "current-user",
          name: "Current User",
          verified: false,
        },
        isBoosted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      setEvents((prev) => [newEvent, ...prev])
    } catch (err) {
      setError("Failed to create event")
    } finally {
      setIsLoading(false)
    }
  }

  const updateEvent = async (id: string, data: Partial<Event>) => {
    setIsLoading(true)
    setError(null)

    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      setEvents((prev) => prev.map((event) => (event.id === id ? { ...event, ...data, updatedAt: new Date() } : event)))
    } catch (err) {
      setError("Failed to update event")
    } finally {
      setIsLoading(false)
    }
  }

  const deleteEvent = async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      setEvents((prev) => prev.filter((event) => event.id !== id))
    } catch (err) {
      setError("Failed to delete event")
    } finally {
      setIsLoading(false)
    }
  }

  const refreshEvents = async () => {
    setIsLoading(true)
    setError(null)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      // In a real app, this would fetch from API
      setEvents(mockEvents)
    } catch (err) {
      setError("Failed to refresh events")
    } finally {
      setIsLoading(false)
    }
  }

  const boostEvent = async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      setEvents((prev) =>
        prev.map((event) => (event.id === id ? { ...event, isBoosted: true, updatedAt: new Date() } : event)),
      )
    } catch (err) {
      setError("Failed to boost event")
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
    createEvent,
    updateEvent,
    deleteEvent,
    setFilters,
    refreshEvents,
    boostEvent,
  }

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
}
