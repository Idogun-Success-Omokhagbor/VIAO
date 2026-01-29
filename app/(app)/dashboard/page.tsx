"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, MapPin, Users, Plus, Search, Filter } from "lucide-react"
import { useEvents } from "@/context/events-context"
import { useAuth } from "@/context/auth-context"
import EventModal from "@/components/event-modal"
import { getLocationString } from "@/lib/utils"
import type { Event } from "@/types/event"

const InteractiveMap = dynamic(() => import("@/components/interactive-map"), { ssr: false })

const CATEGORY_COLORS: Record<string, string> = {
  Technology: "bg-blue-500",
  "Arts & Culture": "bg-purple-500",
  "Sports & Outdoors": "bg-emerald-500",
  Music: "bg-pink-500",
  "Food & Drink": "bg-amber-500",
  "Health & Wellness": "bg-teal-500",
  Business: "bg-indigo-500",
  Education: "bg-sky-500",
}

function getSafeImageSrc(src?: string | null) {
  if (!src) return "/placeholder.svg"
  return src
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, updateUser } = useAuth()
  const { events } = useEvents()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState<"date" | "popularity" | "price">("date")
  const [showEventModal, setShowEventModal] = useState<Event | null>(null)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [detectError, setDetectError] = useState<string | null>(null)
  const didAttemptLocation = useRef(false)

  const userInterests = Array.isArray(user?.interests)
    ? user.interests
        .map((i) => (typeof i === "string" ? i.trim().toLowerCase() : ""))
        .filter((i) => i.length > 0)
    : []

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/")
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (authLoading || !user) return
    if (user.location) return
    if (didAttemptLocation.current) return

    didAttemptLocation.current = true
    setDetectingLocation(true)
    setDetectError(null)

    if (typeof window === "undefined" || !navigator.geolocation) {
      setDetectingLocation(false)
      setDetectError("Location permission is not supported by this browser")
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude
          const lon = position.coords.longitude
          const res = await fetch(`/api/location/reverse?lat=${lat}&lon=${lon}`, { cache: "no-store" })
          const data = await res.json().catch(() => null)
          if (!res.ok) throw new Error(data?.error || "Could not detect location")
          const location = data?.location || data?.city
          if (!location) throw new Error("No location data returned")
          await updateUser({ location })
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to detect location"
          setDetectError(message)
        } finally {
          setDetectingLocation(false)
        }
      },
      (error) => {
        const message = error?.message || "Location permission denied"
        setDetectError(message)
        setDetectingLocation(false)
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 },
    )
  }, [authLoading, updateUser, user])

  if (authLoading || !user) {
    return (
      <div className="h-full min-h-0 bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-full border-4 border-gray-200 border-t-purple-600 animate-spin mx-auto" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  const categories = [
    { value: "all", label: "All Categories", color: "bg-gray-400" },
    { value: "Technology", label: "Technology", color: CATEGORY_COLORS["Technology"] },
    { value: "Arts & Culture", label: "Arts & Culture", color: CATEGORY_COLORS["Arts & Culture"] },
    { value: "Sports & Outdoors", label: "Sports & Outdoors", color: CATEGORY_COLORS["Sports & Outdoors"] },
    { value: "Music", label: "Music", color: CATEGORY_COLORS["Music"] },
    { value: "Food & Drink", label: "Food & Drink", color: CATEGORY_COLORS["Food & Drink"] },
    { value: "Health & Wellness", label: "Health & Wellness", color: CATEGORY_COLORS["Health & Wellness"] },
    { value: "Business", label: "Business", color: CATEGORY_COLORS["Business"] },
    { value: "Education", label: "Education", color: CATEGORY_COLORS["Education"] },
  ]

  const filteredEvents = events
    .filter((event) => {
      const locationStr = getLocationString(event.location)
      const matchesSearch =
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        locationStr.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === "all" || event.category === selectedCategory
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      const now = Date.now()

      const aBoostLevel = typeof a.boostLevel === "number" ? a.boostLevel : 0
      const bBoostLevel = typeof b.boostLevel === "number" ? b.boostLevel : 0

      const aIsPremium = aBoostLevel >= 2
      const bIsPremium = bBoostLevel >= 2

      const aIsBoosted = !!a.isBoosted || aBoostLevel > 0
      const bIsBoosted = !!b.isBoosted || bBoostLevel > 0

      const aHaystack = `${a.category} ${a.title} ${a.description}`.toLowerCase()
      const bHaystack = `${b.category} ${b.title} ${b.description}`.toLowerCase()

      const aMatchesInterests = userInterests.length > 0 && userInterests.some((i) => aHaystack.includes(i))
      const bMatchesInterests = userInterests.length > 0 && userInterests.some((i) => bHaystack.includes(i))

      const aFeatured = userInterests.length > 0 && aIsPremium && aMatchesInterests
      const bFeatured = userInterests.length > 0 && bIsPremium && bMatchesInterests

      if (aFeatured !== bFeatured) return aFeatured ? -1 : 1
      if (aIsPremium !== bIsPremium) return aIsPremium ? -1 : 1
      if (aIsBoosted !== bIsBoosted) return aIsBoosted ? -1 : 1

      const getTimeLeftMs = (event: Event) => {
        const target = event.endsAt ?? event.startsAt ?? event.date
        const ts = new Date(target).getTime()
        if (Number.isNaN(ts)) return Number.NEGATIVE_INFINITY
        return ts - now
      }

      switch (sortBy) {
        case "date":
          return getTimeLeftMs(b) - getTimeLeftMs(a)
        case "popularity":
          return (b.attendeesCount ?? 0) - (a.attendeesCount ?? 0)
        case "price":
          return (a.price ?? 0) - (b.price ?? 0)
        default:
          return 0
      }
    })

  const isOrganizer = user.role === "ORGANIZER"

  return (
    <div className="h-full min-h-0 bg-gray-50 overflow-y-auto">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Discover Events</h1>
              <p className="text-gray-600 mt-1">Find amazing events happening around you</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {detectingLocation ? (
          <div className="mb-6 rounded-md border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-800">
            Detecting your location… Please allow location permission.
          </div>
        ) : null}

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search events, locations, organizers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-64">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  <span className="flex items-center">
                    <span className={`inline-block h-3 w-3 rounded-full mr-2 ${category.color}`} />
                    {category.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as "date" | "popularity" | "price")}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="popularity">Popularity</SelectItem>
              <SelectItem value="price">Price</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                {user.location ? "Events Near You" : "All Events"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-64 md:h-80">
                <InteractiveMap events={filteredEvents} onEventClick={(event) => setShowEventModal(event)} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            return (
              <Card
                key={event.id}
                className={`overflow-hidden cursor-pointer hover:shadow-lg transition-shadow ${event.isBoosted ? "ring-2 ring-yellow-400 ring-opacity-50" : ""}`}
                onClick={() => setShowEventModal(event)}
              >
                <div className="relative">
                  <img src={getSafeImageSrc(event.imageUrl)} alt={event.title} className="w-full h-48 object-cover" />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Badge variant="secondary" className="bg-white/90 text-gray-800">
                      <span
                        className={`inline-block h-3 w-3 rounded-full mr-2 ${CATEGORY_COLORS[event.category] || "bg-gray-400"}`}
                      />
                      {event.category}
                    </Badge>
                  </div>
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
                      {new Date(event.date).toLocaleDateString()} at {event.time}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="truncate">{getLocationString(event.location)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        {event.attendeesCount ?? 0}/{event.maxAttendees || "∞"}
                      </div>
                      <div className="font-semibold">{event.price === 0 ? "Free" : `CHF ${event.price}`}</div>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-4"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowEventModal(event)
                    }}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredEvents.length === 0 && (
          <div className="py-12">
            <div className="mx-auto max-w-2xl">
              <div className="rounded-2xl border bg-gradient-to-br from-white via-white to-gray-50 p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                  <div className="h-12 w-12 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow-sm">
                    <Search className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="text-lg sm:text-xl font-semibold text-gray-900">No events found</div>
                    <div className="mt-1 text-sm text-gray-600 leading-relaxed">
                      Try a different keyword, choose another category, or clear your filters.
                    </div>

                    <div className="mt-5 flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchTerm("")
                          setSelectedCategory("all")
                          setSortBy("date")
                        }}
                      >
                        Clear filters
                      </Button>

                      {isOrganizer ? (
                        <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => router.push("/events")}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create event
                        </Button>
                      ) : null}
                    </div>

                    <div className="mt-4 text-xs text-gray-500">
                      Showing premium events first when available.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showEventModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowEventModal(null)}
        >
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <EventModal event={showEventModal!} onClose={() => setShowEventModal(null)} />
          </div>
        </div>
      )}
    </div>
  )
}
