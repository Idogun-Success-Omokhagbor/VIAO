"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Navigation } from "lucide-react"
import { useEvents } from "@/context/events-context"
import { getLocationString } from "@/lib/utils"
import type { Event } from "@/types/event"

interface InteractiveMapProps {
  events: Event[]
  onEventClick?: (event: Event) => void
}

export default function InteractiveMap({ events: externalEvents, onEventClick }: InteractiveMapProps) {
  const { events: contextEvents } = useEvents()
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [hoveredEvent, setHoveredEvent] = useState<Event | null>(null)

  // Use external events if provided, otherwise use context events
  const events = externalEvents || contextEvents

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setLocationError(null)
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Location access denied by user")
            break
          case error.POSITION_UNAVAILABLE:
            setLocationError("Location information is unavailable")
            break
          case error.TIMEOUT:
            setLocationError("Location request timed out")
            break
          default:
            setLocationError("An unknown error occurred")
            break
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      },
    )
  }

  // Swiss city coordinates for positioning events
  const swissCities: Record<string, { lat: number; lng: number }> = {
    zurich: { lat: 47.3769, lng: 8.5417 },
    geneva: { lat: 46.2044, lng: 6.1432 },
    basel: { lat: 47.5596, lng: 7.5886 },
    bern: { lat: 46.9481, lng: 7.4474 },
    lausanne: { lat: 46.5197, lng: 6.6323 },
    winterthur: { lat: 47.4996, lng: 8.724 },
    lucerne: { lat: 47.0502, lng: 8.3093 },
    interlaken: { lat: 46.6863, lng: 7.8632 },
  }

  const getEventPosition = (event: Event) => {
    const locationStr = getLocationString(event.location).toLowerCase()

    // Try to match with Swiss cities
    for (const [city, coords] of Object.entries(swissCities)) {
      if (locationStr.includes(city)) {
        // Add some randomness to avoid overlapping markers
        return {
          x: ((coords.lng - 5.9) / (10.5 - 5.9)) * 100 + (Math.random() - 0.5) * 5,
          y: ((47.8 - coords.lat) / (47.8 - 45.8)) * 100 + (Math.random() - 0.5) * 5,
        }
      }
    }

    // Default random position in Switzerland bounds
    return {
      x: Math.random() * 80 + 10,
      y: Math.random() * 60 + 20,
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Technology: "bg-blue-500",
      "Arts & Culture": "bg-purple-500",
      "Sports & Outdoors": "bg-green-500",
      Music: "bg-pink-500",
      "Food & Drink": "bg-orange-500",
      "Health & Wellness": "bg-teal-500",
      Business: "bg-gray-500",
      Education: "bg-indigo-500",
    }
    return colors[category] || "bg-gray-500"
  }

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-green-100 via-blue-50 to-purple-100 rounded-lg overflow-hidden">
      {/* Switzerland Map Background */}
      <div className="absolute inset-0">
        {/* Stylized Switzerland outline using CSS */}
        <div
          className="absolute inset-4 bg-gradient-to-br from-green-200 to-blue-200 rounded-lg opacity-30"
          style={{
            clipPath: "polygon(20% 30%, 80% 25%, 85% 45%, 75% 70%, 60% 75%, 40% 80%, 25% 65%, 15% 45%)",
          }}
        />

        {/* Mountain ranges */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-gray-300 to-transparent opacity-20" />

        {/* Lakes */}
        <div className="absolute top-1/2 left-1/4 w-8 h-4 bg-blue-300 rounded-full opacity-40" />
        <div className="absolute top-2/3 right-1/3 w-6 h-3 bg-blue-300 rounded-full opacity-40" />
      </div>

      {/* Control Panel */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button onClick={handleNearMe} variant="secondary" size="sm" className="bg-white/90 hover:bg-white shadow-md">
          <Navigation className="w-4 h-4 mr-1" />
          Near me
        </Button>

        {locationError && <div className="bg-red-100 text-red-700 px-3 py-1 rounded-md text-sm">{locationError}</div>}

        {userLocation && <div className="bg-green-100 text-green-700 px-3 py-1 rounded-md text-sm">Location found</div>}
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 rounded-lg p-3 shadow-md">
        <h4 className="text-sm font-semibold mb-2">Event Types</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Technology</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span>Arts & Culture</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Sports & Outdoors</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
            <span>Music</span>
          </div>
        </div>
      </div>

      {/* User Location Marker */}
      {userLocation && (
        <div
          className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg z-20 transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: "50%",
            top: "50%",
          }}
        >
          <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
        </div>
      )}

      {/* Event Markers */}
      {events.map((event) => {
        const position = getEventPosition(event)
        const categoryColor = getCategoryColor(event.category)

        return (
          <div
            key={event.id}
            className={`absolute w-6 h-6 ${categoryColor} rounded-full border-2 border-white shadow-lg cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-all duration-200 z-10 ${
              event.isBoosted ? "ring-2 ring-yellow-400 ring-opacity-75" : ""
            }`}
            style={{
              left: `${Math.max(5, Math.min(95, position.x))}%`,
              top: `${Math.max(5, Math.min(95, position.y))}%`,
            }}
            onClick={() => onEventClick?.(event)}
            onMouseEnter={() => setHoveredEvent(event)}
            onMouseLeave={() => setHoveredEvent(null)}
          >
            <MapPin className="w-4 h-4 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />

            {/* Boost indicator */}
            {event.isBoosted && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white">
                <div className="w-full h-full bg-yellow-400 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
        )
      })}

      {/* Event Tooltip */}
      {hoveredEvent && (
        <div
          className="absolute z-30 bg-white rounded-lg shadow-xl p-4 max-w-xs pointer-events-none"
          style={{
            left: `${Math.max(5, Math.min(70, getEventPosition(hoveredEvent).x))}%`,
            top: `${Math.max(5, Math.min(70, getEventPosition(hoveredEvent).y - 10))}%`,
          }}
        >
          <div className="flex items-start gap-3">
            {hoveredEvent.imageUrl && (
              <img
                src={hoveredEvent.imageUrl || "/placeholder.svg"}
                alt={hoveredEvent.title}
                className="w-12 h-12 object-cover rounded"
              />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm line-clamp-2 mb-1">{hoveredEvent.title}</h4>
              <p className="text-xs text-gray-600 mb-2">{getLocationString(hoveredEvent.location)}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {hoveredEvent.category}
                </Badge>
                {hoveredEvent.isBoosted && <Badge className="text-xs bg-yellow-400 text-yellow-800">Boosted</Badge>}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {hoveredEvent.price === 0 ? "Free" : `CHF ${hoveredEvent.price}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No Events Message */}
      {events.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No events to display on map</p>
          </div>
        </div>
      )}
    </div>
  )
}
