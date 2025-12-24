"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, MapPin, Users, Zap, Plus } from "lucide-react"
import { useEvents } from "@/context/events-context"
import EventModal from "@/components/event-modal"
import EventForm from "@/components/event-form"
import type { Event } from "@/types/event"

export default function EventsPage() {
  const { events, addEvent } = useEvents()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState("date")
  const [showEventModal, setShowEventModal] = useState<Event | null>(null)
  const [showEventForm, setShowEventForm] = useState(false)
  const [showBoostModal, setShowBoostModal] = useState(false)

  // Sample events with boosted status
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
      rsvpList: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: "boost-2",
      title: "🚀 Yoga & Mindfulness Workshop",
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
      rsvpList: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: "1",
      title: "Art Gallery Opening Night",
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
      title: "Mountain Hiking Adventure",
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
      title: "Indie Music Concert",
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
    "all",
    "Technology",
    "Arts & Culture",
    "Sports & Outdoors",
    "Music",
    "Food & Drink",
    "Health & Wellness",
    "Business",
    "Education",
  ]

  const filteredEvents = allEvents
    .filter((event) => {
      const matchesSearch =
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === "all" || event.category === selectedCategory
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      // Always show boosted events first
      if (a.isBoosted && !b.isBoosted) return -1
      if (!a.isBoosted && b.isBoosted) return 1

      // Then sort by selected criteria
      switch (sortBy) {
        case "date":
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        case "popularity":
          return b.attendees - a.attendees
        case "price":
          return a.price - b.price
        default:
          return 0
      }
    })

  const handleEventClick = (event: Event) => {
    setShowEventModal(event)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Events</h1>
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
          <div className="flex-1">
            <Input
              placeholder="Search events, locations, organizers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category === "all" ? "All Categories" : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="popularity">Popularity</SelectItem>
              <SelectItem value="price">Price</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Boost Info Banner */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Zap className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-sm font-medium text-yellow-800">
                Boosted events appear first and get 3x more visibility
              </span>
            </div>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              CHF 5/day
            </Badge>
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <Card
              key={event.id}
              className={`overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
                event.isBoosted ? "ring-2 ring-yellow-400 ring-opacity-50" : ""
              }`}
              onClick={() => handleEventClick(event)}
            >
              {event.isBoosted && (
                <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-xs font-bold py-1 px-3 text-center">
                  🚀 BOOSTED EVENT
                </div>
              )}
              <div className="relative">
                <img
                  src={event.imageUrl || "/placeholder.svg"}
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
                    {new Date(event.date).toLocaleDateString()} at {event.time}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {event.location}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      {event.attendees}/{event.maxAttendees || "∞"}
                    </div>
                    <div className="font-semibold">{event.price === 0 ? "Free" : `CHF ${event.price}`}</div>
                  </div>
                </div>
                <Button className="w-full mt-4" variant={event.isBoosted ? "default" : "outline"}>
                  {event.isBoosted ? "Join Featured Event" : "Learn More"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
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
          <EventModal event={showEventModal} onClose={() => setShowEventModal(null)} />
        </div>
      )}

      {/* Event Form Modal */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <EventForm onClose={() => setShowEventForm(false)} />
          </div>
        </div>
      )}

      {/* Boost Modal */}
      {showBoostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Boost Your Event</h3>
            <p className="text-gray-600 mb-4">
              Select an existing event to boost to the top of the listings for 24 hours.
            </p>
            <div className="space-y-2 mb-4">
              {events
                .filter((e) => !e.isBoosted)
                .map((event) => (
                  <div key={event.id} className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-gray-500">{event.location}</div>
                  </div>
                ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowBoostModal(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black">Boost for CHF 5</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
