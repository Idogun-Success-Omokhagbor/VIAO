"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Maximize2, Minimize2, Navigation } from "lucide-react"
import { useEvents } from "@/context/events-context"
import { getLocationString } from "@/lib/utils"
import type { Event } from "@/types/event"
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet"
import * as L from "leaflet"

function getSafeImageSrc(src?: string | null) {
  if (!src) return "/placeholder.svg"
  return src
}

interface InteractiveMapProps {
  events: Event[]
  onEventClick?: (event: Event) => void
}

function MapClickHandler({ onClear }: { onClear: () => void }) {
  useMapEvents({
    click: () => {
      onClear()
    },
  })
  return null
}

function MapResizeHandler({ fullscreen }: { fullscreen: boolean }) {
  const map = useMap()
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        map.invalidateSize()
      } catch {
        // ignore
      }
    }, 50)
    return () => window.clearTimeout(id)
  }, [fullscreen, map])
  return null
}

function MarkersLayer({
  items,
  userLocation,
  userIcon,
  getEventLatLng,
  getCategoryColorHex,
  getEventIcon,
  onEventClick,
  onEventHover,
}: {
  items: Event[]
  userLocation: { lat: number; lng: number } | null
  userIcon: L.DivIcon
  getEventLatLng: (event: Event) => { lat: number; lng: number }
  getCategoryColorHex: (category: string) => string
  getEventIcon: (color: string, boosted: boolean) => L.DivIcon
  onEventClick?: (event: Event) => void
  onEventHover: (event: Event, point: { x: number; y: number } | null) => void
}) {
  const map = useMap()

  return (
    <>
      {userLocation ? <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} /> : null}

      {items.map((event) => {
        const pos = getEventLatLng(event)
        const color = getCategoryColorHex(event.category)
        const icon = getEventIcon(color, event.isBoosted)

        return (
          <Marker
            key={event.id}
            position={[pos.lat, pos.lng]}
            icon={icon}
            eventHandlers={{
              click: () => onEventClick?.(event),
              mouseover: () => {
                try {
                  const pt = map.latLngToContainerPoint(L.latLng(pos.lat, pos.lng))
                  onEventHover(event, { x: pt.x, y: pt.y })
                } catch {
                  onEventHover(event, null)
                }
              },
            }}
          />
        )
      })}
    </>
  )
}

function ViewUpdater({
  mode,
  userLatLng,
  eventLatLngs,
  initialCenter,
}: {
  mode: "events" | "user"
  userLatLng: [number, number] | null
  eventLatLngs: Array<[number, number]>
  initialCenter: [number, number]
}) {
  const map = useMap()
  const lastViewKeyRef = useRef<string | null>(null)

  const computeViewKey = useCallback(() => {
    if (mode === "user" && userLatLng) {
      return `user:${userLatLng[0].toFixed(4)},${userLatLng[1].toFixed(4)}`
    }

    if (eventLatLngs.length === 1) {
      const [lat, lng] = eventLatLngs[0]
      return `event:${lat.toFixed(4)},${lng.toFixed(4)}`
    }

    if (eventLatLngs.length > 1) {
      let minLat = Infinity
      let minLng = Infinity
      let maxLat = -Infinity
      let maxLng = -Infinity
      for (const [lat, lng] of eventLatLngs) {
        if (lat < minLat) minLat = lat
        if (lng < minLng) minLng = lng
        if (lat > maxLat) maxLat = lat
        if (lng > maxLng) maxLng = lng
      }
      return `events:${eventLatLngs.length}:${minLat.toFixed(3)},${minLng.toFixed(3)}:${maxLat.toFixed(3)},${maxLng.toFixed(3)}`
    }

    if (userLatLng) {
      return `fallback-user:${userLatLng[0].toFixed(4)},${userLatLng[1].toFixed(4)}`
    }

    return `default:${initialCenter[0].toFixed(3)},${initialCenter[1].toFixed(3)}`
  }, [eventLatLngs, initialCenter, mode, userLatLng])

  useEffect(() => {
    const viewKey = computeViewKey()
    if (lastViewKeyRef.current === viewKey) return
    lastViewKeyRef.current = viewKey

    if (mode === "user" && userLatLng) {
      map.setView(userLatLng, 12, { animate: true })
      return
    }

    if (eventLatLngs.length === 1) {
      map.setView(eventLatLngs[0], 12, { animate: true })
      return
    }

    if (eventLatLngs.length > 1) {
      const bounds = L.latLngBounds(eventLatLngs)
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13, animate: true })
      return
    }

    if (userLatLng) {
      map.setView(userLatLng, 12, { animate: true })
      return
    }

    map.setView(initialCenter, 7, { animate: true })
  }, [computeViewKey, eventLatLngs, initialCenter, map, mode, userLatLng])

  return null
}

export default function InteractiveMap({ events: externalEvents, onEventClick }: InteractiveMapProps) {
  const { events: contextEvents } = useEvents()
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [hoveredEvent, setHoveredEvent] = useState<Event | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number } | null>(null)
  const [viewMode, setViewMode] = useState<"events" | "user">("events")
  const [isFullscreen, setIsFullscreen] = useState(false)

  const clearHovered = useCallback(() => {
    setHoveredEvent(null)
    setHoveredPoint(null)
  }, [])

  // Use external events if provided, otherwise use context events
  const events = externalEvents || contextEvents

  const handleNearMe = useCallback((opts?: { focus?: boolean }) => {
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
        if (opts?.focus) setViewMode("user")
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
  }, [])

  const getEventLocationSearchString = useCallback(
    (event: Event) => {
      const parts: string[] = []
      if (typeof event.city === "string" && event.city.trim().length > 0) parts.push(event.city)
      if (typeof event.venue === "string" && event.venue.trim().length > 0) parts.push(event.venue)
      if (typeof event.address === "string" && event.address.trim().length > 0) parts.push(event.address)
      parts.push(getLocationString(event.location))
      return parts
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()
    },
    [],
  )

  const swissCities = useMemo<Record<string, { lat: number; lng: number }>>(
    () => ({
      zurich: { lat: 47.3769, lng: 8.5417 },
      geneva: { lat: 46.2044, lng: 6.1432 },
      basel: { lat: 47.5596, lng: 7.5886 },
      bern: { lat: 46.9481, lng: 7.4474 },
      lausanne: { lat: 46.5197, lng: 6.6323 },
      winterthur: { lat: 47.4996, lng: 8.724 },
      lucerne: { lat: 47.0502, lng: 8.3093 },
      interlaken: { lat: 46.6863, lng: 7.8632 },
    }),
    [],
  )

  const categoryConfig = useMemo(
    () =>
      [
        { id: "Technology", colorClass: "bg-blue-500", colorHex: "#3b82f6" },
        { id: "Arts & Culture", colorClass: "bg-purple-500", colorHex: "#a855f7" },
        { id: "Sports & Outdoors", colorClass: "bg-green-500", colorHex: "#22c55e" },
        { id: "Music", colorClass: "bg-pink-500", colorHex: "#ec4899" },
        { id: "Food & Drink", colorClass: "bg-orange-500", colorHex: "#f97316" },
        { id: "Health & Wellness", colorClass: "bg-teal-500", colorHex: "#14b8a6" },
        { id: "Business", colorClass: "bg-gray-500", colorHex: "#6b7280" },
        { id: "Education", colorClass: "bg-indigo-500", colorHex: "#6366f1" },
      ] as const,
    [],
  )

  const getCategoryColorHex = useCallback(
    (category: string) => {
      const found = categoryConfig.find((c) => c.id === category)
      return found?.colorHex ?? "#6b7280"
    },
    [categoryConfig],
  )

  const stableSeed = useCallback((value: string) => {
    let hash = 0
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) | 0
    }
    return Math.abs(hash)
  }, [])

  const getEventLatLng = useCallback(
    (event: Event) => {
      if (typeof event.lat === "number" && typeof event.lng === "number") {
        return { lat: event.lat, lng: event.lng }
      }

      const locationStr = getEventLocationSearchString(event)
      for (const [city, coords] of Object.entries(swissCities) as Array<[string, { lat: number; lng: number }]>) {
        if (locationStr.includes(city)) {
          const seed = stableSeed(event.id)
          const jitterLat = ((seed % 1000) / 1000 - 0.5) * 0.04
          const jitterLng = (((seed / 1000) % 1000) / 1000 - 0.5) * 0.06
          return { lat: coords.lat + jitterLat, lng: coords.lng + jitterLng }
        }
      }

      const seed = stableSeed(event.id)
      const lat = 45.8 + ((seed % 10_000) / 10_000) * (47.8 - 45.8)
      const lng = 5.9 + (((seed / 10_000) % 10_000) / 10_000) * (10.5 - 5.9)
      return { lat, lng }
    },
    [getEventLocationSearchString, stableSeed, swissCities],
  )

  useEffect(() => {
    if (!navigator.geolocation) return
    handleNearMe({ focus: false })
  }, [handleNearMe])

  const initialCenter = useMemo<[number, number]>(() => [46.8182, 8.2275], [])

  const eventLatLngs = useMemo<Array<[number, number]>>(
    () =>
      (Array.isArray(events) ? events : []).map((event) => {
        const pos = getEventLatLng(event)
        return [pos.lat, pos.lng]
      }),
    [events, getEventLatLng],
  )

  const userLatLng = useMemo<[number, number] | null>(() => {
    if (!userLocation) return null
    return [userLocation.lat, userLocation.lng]
  }, [userLocation])

  const userIcon = useMemo(() => {
    return L.divIcon({
      className: "viao-marker-container",
      html: `
        <div class="viao-user-pin" aria-hidden="true">
          <svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 37C15 37 28 24.4 28 15C28 7.8 22.2 2 15 2C7.8 2 2 7.8 2 15C2 24.4 15 37 15 37Z" fill="#ef4444"/>
            <path d="M15 21.5C18.5899 21.5 21.5 18.5899 21.5 15C21.5 11.4101 18.5899 8.5 15 8.5C11.4101 8.5 8.5 11.4101 8.5 15C8.5 18.5899 11.4101 21.5 15 21.5Z" fill="white" fill-opacity="0.18"/>
            <path d="M12.2 15.3L14.1 17.2L18.0 13.2" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      `,
      iconSize: [30, 38],
      iconAnchor: [15, 38],
    })
  }, [])

  const getEventIcon = useCallback((color: string, boosted: boolean) => {
    const boostedClass = boosted ? " viao-marker--boosted" : ""
    return L.divIcon({
      className: "viao-marker-container",
      html: `<div class="viao-marker${boostedClass}" style="--viao-marker-color:${color}"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    })
  }, [])


  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[2000] w-screen h-screen bg-gradient-to-br from-green-100 via-blue-50 to-purple-100 overflow-hidden"
          : "relative w-full h-full bg-gradient-to-br from-green-100 via-blue-50 to-purple-100 rounded-lg overflow-hidden"
      }
    >
      {/* Switzerland Map Background */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={initialCenter}
          zoom={7}
          scrollWheelZoom
          className="w-full h-full"
          attributionControl
        >
          <ViewUpdater mode={viewMode} userLatLng={userLatLng} eventLatLngs={eventLatLngs} initialCenter={initialCenter} />
          <MapClickHandler onClear={clearHovered} />
          <MapResizeHandler fullscreen={isFullscreen} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MarkersLayer
            items={events}
            userLocation={userLocation}
            userIcon={userIcon}
            getEventLatLng={getEventLatLng}
            getCategoryColorHex={getCategoryColorHex}
            getEventIcon={getEventIcon}
            onEventClick={onEventClick}
            onEventHover={(event, point) => {
              setHoveredEvent(event)
              if (!point) {
                setHoveredPoint(null)
                return
              }
              setHoveredPoint(point)
            }}
          />
        </MapContainer>
      </div>

      {/* Control Panel */}
      <div className="absolute top-4 left-4 z-[1100] flex gap-2">
        <Button
          onClick={() => handleNearMe({ focus: true })}
          variant="secondary"
          size="sm"
          className="bg-white/90 hover:bg-white shadow-md"
        >
          <Navigation className="w-4 h-4 mr-1" />
          Near me
        </Button>

        {locationError && <div className="bg-red-100 text-red-700 px-3 py-1 rounded-md text-sm">{locationError}</div>}

        {userLocation && <div className="bg-green-100 text-green-700 px-3 py-1 rounded-md text-sm">Location found</div>}
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-[1100] flex flex-col items-end gap-2">
        <Button
          onClick={() => setIsFullscreen((v) => !v)}
          variant="secondary"
          size="icon"
          className="bg-white/90 hover:bg-white shadow-md"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>

        <div className="bg-white/90 rounded-lg p-3 shadow-md">
          <h4 className="text-sm font-semibold mb-2">Event Types</h4>
          <div className="space-y-1 text-xs">
            {categoryConfig.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <div className={`w-3 h-3 ${c.colorClass} rounded-full`}></div>
                <span>{c.id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Location Marker */}
      {userLocation ? null : null}

      {/* Event Markers */}
      {events.length === 0 ? null : null}

      {/* Event Tooltip */}
      {hoveredEvent && hoveredPoint && (
        <div
          className="absolute z-[1200] pointer-events-auto"
          style={{
            left: hoveredPoint.x,
            top: hoveredPoint.y,
            transform: "translate(-50%, calc(-100% - 14px))",
          }}
        >
          <button
            type="button"
            className="text-left bg-white/95 backdrop-blur rounded-xl shadow-2xl ring-1 ring-black/5 overflow-hidden w-72"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onEventClick?.(hoveredEvent)
              setHoveredEvent(null)
              setHoveredPoint(null)
            }}
          >
            <div className="flex gap-3 p-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <img
                  src={getSafeImageSrc(hoveredEvent.imageUrl)}
                  alt={hoveredEvent.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold leading-snug line-clamp-2">{hoveredEvent.title}</div>
                <div className="text-xs text-gray-600 mt-1 line-clamp-1">{getLocationString(hoveredEvent.location)}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {hoveredEvent.category}
                  </Badge>
                  <div className="text-xs text-gray-500">
                    {hoveredEvent.price === 0 ? "Free" : `CHF ${hoveredEvent.price}`}
                  </div>
                </div>
              </div>
            </div>
            <div className="h-1 w-full" style={{ background: getCategoryColorHex(hoveredEvent.category) }} />
          </button>
        </div>
      )}

      {/* No Events Message */}
      {events.length === 0 && (
        <div className="absolute inset-0 z-[1100] flex items-center justify-center">
          <div className="text-center text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No events to display on map</p>
          </div>
        </div>
      )}
    </div>
  )
}
