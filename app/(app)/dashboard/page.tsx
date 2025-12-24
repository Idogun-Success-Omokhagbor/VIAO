"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, MapPin, Users, Plus, Search, Filter, Zap, Crown } from "lucide-react"
import { useEvents } from "@/context/events-context"
import { useAuth } from "@/context/auth-context"
import EventModal from "@/components/event-modal"
import EventForm from "@/components/event-form"
import InteractiveMap from "@/components/interactive-map"
import { getLocationString } from "@/lib/utils"
import type { Event } from "@/types/event"

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { events, addEvent } = useEvents()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showEventModal, setShowEventModal] = useState<Event | null>(null)
  const [showEventForm, setShowEventForm] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/")
    }
  }, [authLoading, user, router])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-full border-4 border-gray-200 border-t-purple-600 animate-spin mx-auto" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // Sample events with string locations to avoid object rendering issues
  const sampleEvents: Event[] = [
    {
      id: "boost-1",
      title: "🚀 Zurich Tech Summit 2024",
      description: "The biggest tech conference in Switzerland featuring AI, blockchain, and startup pitches.",
      date: new Date().toISOString(),
      time: "09:00",
      location: "ETH Zurich, Main Building",
      category: "Technology",
      organizer: "Tech Events Zurich",
      userId: "organizer1",
      attendees: 245,
      maxAttendees: 300,
      price: 150,
      imageUrl: "/tech-startup-meetup-networking.png",
      isBoosted: true,
      boostCount: 2,
      boostedUntil: new Date(Date.now() + 86400000).toISOString(),
      rsvpList: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: "boost-2",
      title: "🧘 Yoga & Mindfulness Workshop",
      description: "Start your day with energizing yoga and meditation in beautiful Zurich park.",
      date: new Date().toISOString(),
      time: "07:30",
      location: "Zurichsee Park, Zurich",
      category: "Health & Wellness",
      organizer: "Zen Studio Zurich",
      userId: "organizer2",
      attendees: 28,
      maxAttendees: 35,
      price: 25,
      imageUrl: "/placeholder.svg?height=200&width=300&text=Yoga+Workshop",
      isBoosted: true,
      boostCount: 1,
      boostedUntil: new Date(Date.now() + 43200000).toISOString(),
      rsvpList: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: "1",
      title: "🎨 Art Gallery Opening Night",
      description: "Discover contemporary Swiss artists in this exclusive gallery opening.",
      date: new Date(Date.now() + 86400000).toISOString(),
      time: "18:00",
      location: "Modern Art Gallery, Geneva",
      category: "Arts & Culture",
      organizer: "Geneva Arts Council",
      userId: "organizer3",
      attendees: 67,
      maxAttendees: 80,
      price: 0,
      imageUrl: "/art-gallery-people-paintings.png",
      isBoosted: false,
      rsvpList: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      title: "🥾 Mountain Hiking Adventure",
      description: "Join us for a scenic hike through the Swiss Alps with experienced guides.",
      date: new Date(Date.now() + 172800000).toISOString(),
      time: "08:00",
      location: "Interlaken Train Station",
      category: "Sports & Outdoors",
      organizer: "Alpine Adventures",
      userId: "organizer4",
      attendees: 15,
      maxAttendees: 20,
      price: 45,
      imageUrl: "/forest-trail-hikers.png",
      isBoosted: false,
      rsvpList: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: "3",
      title: "🎵 Indie Music Concert",
      description: "Live performances by emerging Swiss indie bands in an intimate venue.",
      date: new Date(Date.now() + 259200000).toISOString(),
      time: "20:00",
      location: "Underground Club, Basel",
      category: "Music",
      organizer: "Indie Basel",
      userId: "organizer5",
      attendees: 89,
      maxAttendees: 120,
      price: 30,
      imageUrl: "/indie-concert-lights.png",
      isBoosted: false,
      rsvpList: [],
      createdAt: new Date().toISOString(),
    },
  ]

  const allEvents = [...sampleEvents, ...events]

  const categories = [
    { value: "all", label: "All Categories", emoji: "🌟" },
    { value: "Technology", label: "Technology", emoji: "💻" },
    { value: "Arts & Culture", label: "Arts & Culture", emoji: "🎨" },
    { value: "Sports & Outdoors", label: "Sports & Outdoors", emoji: "⚽" },
    { value: "Music", label: "Music", emoji: "🎵" },
    { value: "Food & Drink", label: "Food & Drink", emoji: "🍽️" },
    { value: "Health & Wellness", label: "Health & Wellness", emoji: "🧘" },
    { value: "Business", label: "Business", emoji: "💼" },
    { value: "Education", label: "Education", emoji: "📚" },
  ]

  const filteredEvents = allEvents
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
      // Always show boosted events first
      if (a.isBoosted && !b.isBoosted) return -1
      if (!a.isBoosted && b.isBoosted) return 1
      // Then sort by date
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    })

  const handleEventClick = (event: Event) => {
    setShowEventModal(event)
  }

  const handleCloseEventModal = () => {
    setShowEventModal(null)
  }

  const handleCreateEvent = (eventData: Omit<Event, "id" | "attendees">) => {
    const newEvent: Event = {
      ...eventData,
      id: Date.now().toString(),
      attendees: 0,
      isBoosted: false,
      rsvpList: [],
      createdAt: new Date().toISOString(),
    }
    addEvent(newEvent)
    setShowEventForm(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Discover Events</h1>
              <p className="text-gray-600 mt-1">Find amazing events happening around you</p>
            </div>
            <Button onClick={() => setShowEventForm(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
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
                    <span className="mr-2">{category.emoji}</span>
                    {category.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Map Section */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Events Near You
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-64 md:h-80">
                <InteractiveMap events={filteredEvents} onEventClick={handleEventClick} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <Card
              key={event.id}
              className={`overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105 ${
                event.isBoosted ? "ring-2 ring-yellow-400 ring-opacity-50" : ""
              }`}
              onClick={() => handleEventClick(event)}
            >
              {/* Boost Badge */}
              {event.isBoosted && (
                <div
                  className={`text-xs font-bold py-1 px-3 text-center ${
                    event.boostCount && event.boostCount >= 2
                      ? "bg-gradient-to-r from-yellow-400 to-orange-400 text-white"
                      : "bg-yellow-400 text-yellow-800"
                  }`}
                >
                  {event.boostCount && event.boostCount >= 2 ? (
                    <>
                      <Crown className="inline w-3 h-3 mr-1" />
                      PREMIUM BOOSTED
                    </>
                  ) : (
                    <>
                      <Zap className="inline w-3 h-3 mr-1" />
                      BOOSTED EVENT
                    </>
                  )}
                </div>
              )}

              {/* Event Image */}
              <div className="relative">
                <img
                  src={event.imageUrl || "/placeholder.svg"}
                  alt={event.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Badge variant="secondary" className="bg-white/90 text-gray-800">
                    {categories.find((c) => c.value === event.category)?.emoji} {event.category}
                  </Badge>
                </div>
                {event.price === 0 && <Badge className="absolute top-2 left-2 bg-green-500">Free</Badge>}
              </div>

              {/* Event Content */}
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
                      {event.attendees}/{event.maxAttendees || "∞"}
                    </div>
                    <div className="font-semibold">{event.price === 0 ? "Free" : `CHF ${event.price}`}</div>
                  </div>
                </div>

                <Button
                  className="w-full mt-4"
                  variant={event.isBoosted ? "default" : "outline"}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEventClick(event)
                  }}
                >
                  {event.isBoosted ? "View Featured Event" : "View Details"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No Events Found */}
        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎭</div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No events found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your search criteria or create a new event</p>
            <Button onClick={() => setShowEventForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
        )}
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <EventModal event={showEventModal} onClose={handleCloseEventModal} />
          </div>
        </div>
      )}

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <EventForm onClose={() => setShowEventForm(false)} onSubmit={handleCreateEvent} />
          </div>
        </div>
      )}
    </div>
  )
}
