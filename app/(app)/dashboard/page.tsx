"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, MapPin, Users, Plus, Search, Filter, Zap } from "lucide-react"
import { useEvents } from "@/context/events-context"
import { useAuth } from "@/context/auth-context"
import EventModal from "@/components/event-modal"
import EventForm from "@/components/event-form"
import InteractiveMap from "@/components/interactive-map"
import { getLocationString } from "@/lib/utils"
import type { Event } from "@/types/event"

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

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { events } = useEvents()
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
      if (a.isBoosted && !b.isBoosted) return -1
      if (!a.isBoosted && b.isBoosted) return 1
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    })

  return (
    <div className="min-h-screen bg-gray-50">
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
        </div>

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
                <InteractiveMap events={filteredEvents} onEventClick={(event) => setShowEventModal(event)} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <Card
              key={event.id}
              className={`overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105 ${
                event.isBoosted ? "ring-2 ring-yellow-400 ring-opacity-50" : ""
              }`}
              onClick={() => setShowEventModal(event)}
            >
              {event.isBoosted && (
                <div className="text-xs font-bold py-1 px-3 text-center bg-yellow-400 text-yellow-800">
                  <Zap className="inline w-3 h-3 mr-1" />
                  BOOSTED EVENT
                </div>
              )}

              <div className="relative">
                <img src={event.imageUrl || "/placeholder.svg"} alt={event.title} className="w-full h-48 object-cover" />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Badge variant="secondary" className="bg-white/90 text-gray-800">
                    <span
                      className={`inline-block h-3 w-3 rounded-full mr-1 ${
                        categories.find((c) => c.value === event.category)?.color || "bg-gray-400"
                      }`}
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
                  variant={event.isBoosted ? "default" : "outline"}
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowEventModal(event)
                  }}
                >
                  {event.isBoosted ? "View Featured Event" : "View Details"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <img src="/icon.svg" alt="No events" className="h-16 w-16 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No events found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your search criteria or create a new event</p>
            <Button onClick={() => setShowEventForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
        )}
      </div>

      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <EventModal event={showEventModal} onClose={() => setShowEventModal(null)} />
          </div>
        </div>
      )}

      {showEventForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <EventForm onClose={() => setShowEventForm(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
