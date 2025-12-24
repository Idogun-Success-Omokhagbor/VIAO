"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, Users, ArrowRight, Star, Clock } from "lucide-react"

const featuredEvents = [
  {
    id: "1",
    title: "Tech Innovation Summit 2024",
    description: "Join industry leaders and innovators for a day of cutting-edge technology discussions.",
    image: "/tech-startup-meetup-networking.png",
    date: "Dec 28, 2024",
    time: "9:00 AM",
    location: "Zurich Convention Center",
    attendees: 245,
    category: "Technology",
    rating: 4.8,
    price: "Free",
  },
  {
    id: "2",
    title: "Winter Art Gallery Opening",
    description: "Discover amazing local artists and their latest winter-themed masterpieces.",
    image: "/art-gallery-people-paintings.png",
    date: "Dec 30, 2024",
    time: "6:00 PM",
    location: "Geneva Art District",
    attendees: 89,
    category: "Arts & Culture",
    rating: 4.9,
    price: "CHF 15",
  },
  {
    id: "3",
    title: "New Year's Rooftop Party",
    description: "Ring in the new year with stunning city views, great music, and amazing company.",
    image: "/rooftop-sunset-party.png",
    date: "Dec 31, 2024",
    time: "10:00 PM",
    location: "Sky Lounge Zurich",
    attendees: 156,
    category: "Nightlife",
    rating: 4.7,
    price: "CHF 45",
  },
]

const categories = [
  { name: "Music & Concerts", count: 24, color: "bg-purple-100 text-purple-700" },
  { name: "Food & Drink", count: 18, color: "bg-orange-100 text-orange-700" },
  { name: "Sports & Fitness", count: 31, color: "bg-green-100 text-green-700" },
  { name: "Arts & Culture", count: 15, color: "bg-blue-100 text-blue-700" },
  { name: "Technology", count: 12, color: "bg-indigo-100 text-indigo-700" },
  { name: "Business", count: 9, color: "bg-gray-100 text-gray-700" },
]

export function ExploreSection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Explore What's Happening</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover amazing events, connect with your community, and create unforgettable memories
          </p>
        </div>

        {/* Featured Events */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-semibold">Featured Events</h3>
            <Button variant="outline" className="bg-transparent">
              View All Events
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredEvents.map((event) => (
              <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img src={event.image || "/placeholder.svg"} alt={event.title} className="w-full h-48 object-cover" />
                  <Badge className="absolute top-3 left-3 bg-white text-gray-900">{event.category}</Badge>
                  <div className="absolute top-3 right-3 bg-black/50 text-white px-2 py-1 rounded text-sm">
                    {event.price}
                  </div>
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
                    <div className="flex items-center gap-1 text-sm text-yellow-600">
                      <Star className="w-4 h-4 fill-current" />
                      {event.rating}
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">{event.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{event.date}</span>
                      <Clock className="w-4 h-4 ml-2" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{event.attendees} attending</span>
                    </div>
                  </div>
                  <Button className="w-full mt-4">View Details</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div>
          <div className="text-center mb-8">
            <h3 className="text-2xl font-semibold mb-4">Browse by Category</h3>
            <p className="text-gray-600">Find events that match your interests</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Card key={category.name} className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-6 text-center">
                  <div
                    className={`w-12 h-12 rounded-full ${category.color} mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    <span className="text-lg font-semibold">{category.count}</span>
                  </div>
                  <h4 className="font-medium text-sm">{category.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">{category.count} events</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default ExploreSection
