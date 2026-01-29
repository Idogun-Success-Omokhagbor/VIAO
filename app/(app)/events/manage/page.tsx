"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Users, Zap, Ban } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import EventModal from "@/components/event-modal"
import type { Event } from "@/types/event"

function getSafeImageSrc(src?: string | null) {
  if (!src) return "/placeholder.svg"
  return src
}

export default function ManageEventsPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/events/me/organized", { cache: "no-store", credentials: "include" })
        const data = (await res.json().catch(() => ({}))) as { events?: Event[]; error?: string }
        if (!res.ok) throw new Error(data.error || "Failed to load events")
        setEvents(Array.isArray(data.events) ? data.events : [])
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load events")
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  const selected = selectedId ? events.find((e) => e.id === selectedId) ?? null : null

  const isOrganizer = user?.role === "ORGANIZER"

  if (!isOrganizer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold text-gray-900">Manage Events</h1>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 px-4 py-3 rounded">
            Only organizers can access this page.
          </div>
          <div className="mt-4">
            <Link href="/events">
              <Button variant="outline">Back to Events</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Manage Events</h1>
          <div className="flex gap-2">
            <Link href="/events">
              <Button variant="outline">All Events</Button>
            </Link>
            <Link href="/events/saved">
              <Button variant="outline">Saved</Button>
            </Link>
            <Link href="/events/rsvps">
              <Button variant="outline">My RSVPs</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {isLoading && <div className="flex items-center justify-center py-12 text-gray-600">Loading your events...</div>}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
        )}

        {!isLoading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <Card
                  key={event.id}
                  className={`relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
                    event.isBoosted ? "ring-2 ring-yellow-400 ring-opacity-50" : ""
                  }`}
                  onClick={() => setSelectedId(event.id)}
                >
                  {event.isCancelled && (
                    <div className="bg-gray-800 text-white text-xs font-bold py-1 px-3 text-center flex items-center justify-center gap-2">
                      <Ban className="h-3 w-3" />
                      CANCELLED
                    </div>
                  )}
                  {event.isBoosted && !event.isCancelled && (
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-xs font-bold py-1 px-3 text-center flex items-center justify-center gap-2">
                      <Zap className="h-3 w-3" />
                      BOOSTED
                    </div>
                  )}
                  <div className="relative">
                    <img
                      src={getSafeImageSrc(event.imageUrls && event.imageUrls.length > 0 ? event.imageUrls[0] : event.imageUrl)}
                      alt={event.title}
                      className="w-full h-48 object-cover"
                    />
                    <Badge className="absolute top-2 right-2 bg-white/90 text-gray-800">{event.category}</Badge>
                    {event.price === 0 && <Badge className="absolute top-2 left-2 bg-green-500">Free</Badge>}
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
                    <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(event.date).toLocaleDateString()} {event.time ? `at ${event.time}` : ""}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        {event.location}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          {event.attendeesCount ?? 0}/{event.maxAttendees || "∞"}
                        </div>
                        <div className="font-semibold">{event.price === 0 ? "Free" : `CHF ${event.price ?? 0}`}</div>
                      </div>
                    </div>
                    <Button className="w-full mt-4" variant="outline">
                      Open Manage
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {events.length === 0 && (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No events yet</h3>
                <p className="text-gray-500">Create events to manage them here.</p>
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedId(null)}
        >
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <EventModal event={selected} onClose={() => setSelectedId(null)} />
          </div>
        </div>
      )}
    </div>
  )
}
