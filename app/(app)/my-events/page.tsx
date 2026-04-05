"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { AppImage } from "@/components/ui/app-image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, MapPin, Bookmark, CheckCircle2 } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { getLocationString } from "@/lib/utils"
import { getEventCategoryColor } from "@/lib/event-categories"
import { getErrorMessage, readJsonOrNull } from "@/lib/http"
import type { EventModalProps } from "@/components/event-modal"
import type { Event } from "@/types/event"

const EventModal = dynamic<EventModalProps>(() => import("@/components/event-modal"), { ssr: false })

async function fetchMyEvents(path: "/api/events/me/rsvps" | "/api/events/me/saved") {
  const res = await fetch(path, { cache: "no-store", credentials: "include" })
  const data = await readJsonOrNull<{ events?: Event[]; error?: string }>(res)
  if (!res.ok) throw new Error(getErrorMessage(data, "Failed to load events"))
  return Array.isArray(data?.events) ? data.events : []
}

export default function MyEventsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const [activeTab, setActiveTab] = useState<MyEventsTab>("rsvp")
  const [rsvpEvents, setRsvpEvents] = useState<Event[]>([])
  const [savedEvents, setSavedEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  type MyEventsTab = "rsvp" | "saved"
  const isMyEventsTab = (value: string): value is MyEventsTab => value === "rsvp" || value === "saved"

  useEffect(() => {
    if (authLoading) return
    if (!user) router.replace("/")
  }, [authLoading, router, user])

  useEffect(() => {
    if (authLoading || !user) return

    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([fetchMyEvents("/api/events/me/rsvps"), fetchMyEvents("/api/events/me/saved")])
      .then(([rsvps, saved]) => {
        if (cancelled) return
        setRsvpEvents(rsvps)
        setSavedEvents(saved)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load your events")
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [authLoading, user])

  const tabEvents = useMemo(() => {
    return activeTab === "rsvp" ? rsvpEvents : savedEvents
  }, [activeTab, rsvpEvents, savedEvents])

  if (authLoading || !user) {
    return (
      <div className="h-full min-h-0 bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 bg-gray-50 overflow-y-auto">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Events</h1>
            <p className="text-sm text-gray-600">
              Your RSVP'd and saved events in one place.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {error ? (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (isMyEventsTab(value)) setActiveTab(value)
          }}
        >
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="rsvp" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              RSVP
              <Badge variant="secondary" className="ml-1">
                {rsvpEvents.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <Bookmark className="h-4 w-4" />
              Saved
              <Badge variant="secondary" className="ml-1">
                {savedEvents.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rsvp" className="mt-6">
            {loading ? (
              <div className="text-sm text-gray-600">Loading your RSVP events...</div>
            ) : tabEvents.length === 0 ? (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">No RSVP events yet</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600">
                  RSVP to events and they'll show up here.
                  <div className="mt-4">
                    <Button variant="outline" onClick={() => router.push("/dashboard")}>Browse events</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <EventGrid events={tabEvents} onOpen={(e) => setSelectedEvent(e)} />
            )}
          </TabsContent>

          <TabsContent value="saved" className="mt-6">
            {loading ? (
              <div className="text-sm text-gray-600">Loading your saved events...</div>
            ) : tabEvents.length === 0 ? (
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="text-base">No saved events yet</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600">
                  Save events you like and they'll show up here.
                  <div className="mt-4">
                    <Button variant="outline" onClick={() => router.push("/dashboard")}>Browse events</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <EventGrid events={tabEvents} onOpen={(e) => setSelectedEvent(e)} />
            )}
          </TabsContent>
        </Tabs>

        {selectedEvent && (
          <div
            className="fixed inset-0 z-[4000] bg-black/50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto"
            onClick={() => setSelectedEvent(null)}
          >
            <div className="max-w-4xl w-full max-h-[92dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EventGrid({ events, onOpen }: { events: Event[]; onOpen: (e: Event) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => {
        const categoryColor = getEventCategoryColor(event.category)
        const image = (event.imageUrls && event.imageUrls.length > 0 ? event.imageUrls[0] : event.imageUrl) || "/placeholder.svg"

        return (
          <Card
            key={event.id}
            className={`overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-[1.02] ${
              event.isBoosted ? "ring-2 ring-yellow-400 ring-opacity-50" : ""
            }`}
            onClick={() => onOpen(event)}
          >
            <div className="relative">
              <AppImage
                src={image}
                alt={event.title}
                width={800}
                height={352}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="w-full h-44 object-cover"
              />
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="bg-white/90 text-gray-800">
                  <span className={`inline-block h-3 w-3 rounded-full mr-2 ${categoryColor}`} />
                  {event.category}
                </Badge>
              </div>
              {event.price === 0 ? <Badge className="absolute top-2 left-2 bg-green-500">Free</Badge> : null}
            </div>

            <CardHeader className="pb-2">
              <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
              <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {new Date(event.startsAt ?? event.date).toLocaleString()}
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span className="truncate">{getLocationString(event.location)}</span>
                </div>
              </div>

              <Button className="w-full mt-4" variant="outline" onClick={(e) => {
                e.stopPropagation()
                onOpen(event)
              }}>
                View Details
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

