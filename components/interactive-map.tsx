"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AppImage } from "@/components/ui/app-image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Maximize2, Minimize2, Navigation } from "lucide-react"
import { useEvents } from "@/context/events-context"
import { GOOGLE_MAPS_MAP_ID, getGoogleMapsApiKey, loadGoogleMaps } from "@/lib/google-maps"
import { getLocationString } from "@/lib/utils"
import type { Event } from "@/types/event"

interface InteractiveMapProps {
  events: Event[]
  onEventClick?: (event: Event) => void
}

type Point = { x: number; y: number }
type LatLng = { lat: number; lng: number }
type GoogleMapListener = { remove?: () => void }
type GoogleMapInstance = {
  setCenter: (center: LatLng) => void
  setZoom: (zoom: number) => void
  fitBounds: (bounds: GoogleLatLngBoundsInstance, padding?: number) => void
  addListener?: (eventName: string, handler: () => void) => GoogleMapListener
}
type GoogleLatLngBoundsInstance = {
  extend: (point: LatLng) => void
}
type GoogleMarkerInstance = {
  map: GoogleMapInstance | null
}
type GoogleMapsApi = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance
  LatLngBounds: new () => GoogleLatLngBoundsInstance
  importLibrary: (library: string) => Promise<unknown>
  event?: {
    clearInstanceListeners?: (instance: object) => void
    trigger?: (instance: object, eventName: string) => void
  }
}

type MapsRuntime = {
  maps: GoogleMapsApi
  AdvancedMarkerElement: new (options: Record<string, unknown>) => GoogleMarkerInstance
}

function toMapErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Failed to load Google Maps"

  if (/ApiNotActivatedMapError/i.test(message)) {
    return "Google Maps JavaScript API is not activated for this key yet. Enable the Maps JavaScript API in Google Cloud."
  }

  if (/billing/i.test(message) || /authorization failed/i.test(message)) {
    return "Google Maps is not authorized yet. Check that billing is enabled and the Maps JavaScript API is active for this project."
  }

  return message
}

function createMarkerNode({ color, boosted }: { color: string; boosted: boolean }) {
  const container = document.createElement("div")
  container.className = "viao-marker-container"
  container.innerHTML = `<div class="viao-marker${boosted ? " viao-marker--boosted" : ""}" style="--viao-marker-color:${color}"></div>`
  return container
}

function createUserMarkerNode() {
  const container = document.createElement("div")
  container.className = "viao-marker-container"
  container.innerHTML = `
    <div class="viao-user-pin" aria-hidden="true">
      <svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 37C15 37 28 24.4 28 15C28 7.8 22.2 2 15 2C7.8 2 2 7.8 2 15C2 24.4 15 37 15 37Z" fill="#ef4444"/>
        <path d="M15 21.5C18.5899 21.5 21.5 18.5899 21.5 15C21.5 11.4101 18.5899 8.5 15 8.5C11.4101 8.5 8.5 11.4101 8.5 15C8.5 18.5899 11.4101 21.5 15 21.5Z" fill="white" fill-opacity="0.18"/>
        <path d="M12.2 15.3L14.1 17.2L18.0 13.2" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  `
  return container
}

export default function InteractiveMap({ events: externalEvents, onEventClick }: InteractiveMapProps) {
  const { events: contextEvents } = useEvents()
  const [userLocation, setUserLocation] = useState<LatLng | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [hoveredEvent, setHoveredEvent] = useState<Event | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<Point | null>(null)
  const [viewMode, setViewMode] = useState<"events" | "user">("events")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mapsRuntime, setMapsRuntime] = useState<MapsRuntime | null>(null)
  const [mapLoadError, setMapLoadError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const frameRef = useRef<HTMLDivElement | null>(null)
  const mapElementRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<GoogleMapInstance | null>(null)
  const mapsRuntimeRef = useRef<MapsRuntime | null>(null)
  const mapReadyRef = useRef(false)
  const mapReadyTimeoutRef = useRef<number | null>(null)
  const markerRefs = useRef<GoogleMarkerInstance[]>([])
  const userMarkerRef = useRef<GoogleMarkerInstance | null>(null)
  const mapListenerRefs = useRef<GoogleMapListener[]>([])
  const markerCleanupRefs = useRef<Array<() => void>>([])

  const clearHovered = useCallback(() => {
    setHoveredEvent(null)
    setHoveredPoint(null)
  }, [])

  const events = externalEvents || contextEvents
  const missingApiKey = !getGoogleMapsApiKey()
  const showMapChrome = !missingApiKey && !mapLoadError && mapReady
  const fallbackEvents = events.slice(0, 3)

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
        timeout: 10_000,
        maximumAge: 300_000,
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

  const swissCities = useMemo<Record<string, LatLng>>(
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
      for (const [city, coords] of Object.entries(swissCities)) {
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

  const initialCenter = useMemo<LatLng>(() => ({ lat: 46.8182, lng: 8.2275 }), [])

  const eventLatLngs = useMemo(
    () =>
      (Array.isArray(events) ? events : []).map((event) => {
        const pos = getEventLatLng(event)
        return pos
      }),
    [events, getEventLatLng],
  )

  const updateHoveredFromElement = useCallback((event: Event, element: HTMLElement) => {
    const frame = frameRef.current
    if (!frame) return

    const frameRect = frame.getBoundingClientRect()
    const markerRect = element.getBoundingClientRect()
    setHoveredEvent(event)
    setHoveredPoint({
      x: markerRect.left - frameRect.left + markerRect.width / 2,
      y: markerRect.top - frameRect.top + markerRect.height / 2,
    })
  }, [])

  const clearMarkers = useCallback(() => {
    markerCleanupRefs.current.forEach((cleanup) => cleanup())
    markerCleanupRefs.current = []

    markerRefs.current.forEach((marker) => {
      if (marker) marker.map = null
    })
    markerRefs.current = []

    if (userMarkerRef.current) {
      userMarkerRef.current.map = null
      userMarkerRef.current = null
    }
  }, [])

  const syncViewport = useCallback(() => {
    const map = mapRef.current
    const runtime = mapsRuntime
    if (!map || !runtime) return

    if (viewMode === "user" && userLocation) {
      map.setCenter(userLocation)
      map.setZoom(12)
      return
    }

    if (eventLatLngs.length === 1) {
      map.setCenter(eventLatLngs[0])
      map.setZoom(12)
      return
    }

    if (eventLatLngs.length > 1) {
      const bounds = new runtime.maps.LatLngBounds()
      eventLatLngs.forEach((point) => bounds.extend(point))
      map.fitBounds(bounds, 48)
      return
    }

    if (userLocation) {
      map.setCenter(userLocation)
      map.setZoom(12)
      return
    }

    map.setCenter(initialCenter)
    map.setZoom(7)
  }, [eventLatLngs, initialCenter, mapsRuntime, userLocation, viewMode])

  useEffect(() => {
    let cancelled = false

    const setupMap = async () => {
      if (missingApiKey || !mapElementRef.current) return

      try {
        mapReadyRef.current = false
        setMapReady(false)
        if (mapReadyTimeoutRef.current) {
          window.clearTimeout(mapReadyTimeoutRef.current)
        }
        mapReadyTimeoutRef.current = window.setTimeout(() => {
          if (!mapReadyRef.current) {
            setMapLoadError("The live map is taking longer than expected.")
          }
        }, 4000)

        const maps = (await loadGoogleMaps()) as unknown as GoogleMapsApi
        const mapsLibrary = await maps.importLibrary("maps")
        const markerLibrary = await maps.importLibrary("marker")
        if (cancelled || !mapElementRef.current) return

        const MapCtor = (mapsLibrary as { Map?: MapsRuntime["maps"]["Map"] }).Map ?? maps.Map
        const AdvancedMarkerCtor = (markerLibrary as { AdvancedMarkerElement?: MapsRuntime["AdvancedMarkerElement"] }).AdvancedMarkerElement

        if (!MapCtor || !AdvancedMarkerCtor) {
          throw new Error("Required Google Maps libraries are unavailable")
        }

        const map = new MapCtor(mapElementRef.current, {
          center: initialCenter,
          zoom: 7,
          mapId: GOOGLE_MAPS_MAP_ID,
          clickableIcons: false,
          disableDefaultUI: false,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          gestureHandling: "greedy",
          zoomControl: true,
        })

        mapListenerRefs.current.forEach((listener) => listener.remove?.())
        mapListenerRefs.current = [
          map.addListener?.("click", clearHovered),
          map.addListener?.("dragstart", clearHovered),
          map.addListener?.("zoom_changed", clearHovered),
          map.addListener?.("tilesloaded", () => {
            mapReadyRef.current = true
            setMapReady(true)
            setMapLoadError(null)
            if (mapReadyTimeoutRef.current) {
              window.clearTimeout(mapReadyTimeoutRef.current)
              mapReadyTimeoutRef.current = null
            }
          }),
        ].filter((listener): listener is GoogleMapListener => Boolean(listener))

        const runtime = { maps, AdvancedMarkerElement: AdvancedMarkerCtor }
        mapRef.current = map
        mapsRuntimeRef.current = runtime
        setMapsRuntime(runtime)
        setMapLoadError(null)
      } catch (error) {
        if (!cancelled) {
          mapReadyRef.current = false
          setMapReady(false)
          setMapLoadError(toMapErrorMessage(error))
          setMapsRuntime(null)
        }
      }
    }

    void setupMap()

    return () => {
      cancelled = true
      mapListenerRefs.current.forEach((listener) => listener.remove?.())
      mapListenerRefs.current = []
      if (mapReadyTimeoutRef.current) {
        window.clearTimeout(mapReadyTimeoutRef.current)
        mapReadyTimeoutRef.current = null
      }
      clearMarkers()
      if (mapRef.current && mapsRuntimeRef.current?.maps.event?.clearInstanceListeners) {
        mapsRuntimeRef.current.maps.event.clearInstanceListeners(mapRef.current)
      }
      mapRef.current = null
      mapsRuntimeRef.current = null
    }
  }, [clearHovered, clearMarkers, initialCenter, missingApiKey])

  useEffect(() => {
    if (!mapsRuntime || !mapRef.current) return

    try {
      clearMarkers()

      const map = mapRef.current
      const { AdvancedMarkerElement } = mapsRuntime

      if (userLocation) {
        userMarkerRef.current = new AdvancedMarkerElement({
          map,
          position: userLocation,
          content: createUserMarkerNode(),
          title: "Your location",
          zIndex: 20,
        })
      }

      markerRefs.current = events.map((event) => {
        const pos = getEventLatLng(event)
        const color = getCategoryColorHex(event.category)
        const content = createMarkerNode({ color, boosted: Boolean(event.isBoosted) })

        const handleMouseEnter = () => updateHoveredFromElement(event, content)
        const handleClick = () => {
          updateHoveredFromElement(event, content)
          onEventClick?.(event)
        }

        content.addEventListener("mouseenter", handleMouseEnter)
        content.addEventListener("click", handleClick)

        markerCleanupRefs.current.push(() => {
          content.removeEventListener("mouseenter", handleMouseEnter)
          content.removeEventListener("click", handleClick)
        })

        return new AdvancedMarkerElement({
          map,
          position: pos,
          content,
          title: event.title,
          zIndex: event.isBoosted ? 15 : 10,
        })
      })
      setMapLoadError(null)
    } catch (error) {
      mapReadyRef.current = false
      setMapReady(false)
      clearMarkers()
      setMapLoadError(toMapErrorMessage(error))
      setMapsRuntime(null)
    }
  }, [clearMarkers, events, getCategoryColorHex, getEventLatLng, mapsRuntime, onEventClick, updateHoveredFromElement, userLocation])

  useEffect(() => {
    syncViewport()
  }, [syncViewport])

  useEffect(() => {
    if (!mapsRuntime || !mapRef.current) return

    const id = window.setTimeout(() => {
      const map = mapRef.current
      if (!map) return
      mapsRuntime.maps.event?.trigger?.(map, "resize")
      syncViewport()
    }, 120)

    return () => window.clearTimeout(id)
  }, [isFullscreen, mapsRuntime, syncViewport])

  return (
    <div
      ref={frameRef}
      className={
        isFullscreen
          ? "fixed inset-0 z-[2000] w-screen h-[100dvh] bg-gradient-to-br from-green-100 via-blue-50 to-purple-100 overflow-hidden"
          : "relative w-full h-full bg-gradient-to-br from-green-100 via-blue-50 to-purple-100 rounded-lg overflow-hidden"
      }
    >
      <div ref={mapElementRef} className={`absolute inset-0 z-0 ${showMapChrome ? "" : "pointer-events-none opacity-0"}`} />

      {!missingApiKey && !mapLoadError && !mapReady ? (
        <div className={isFullscreen ? "absolute inset-0 z-[2100] flex items-center justify-center" : "absolute inset-0 z-30 flex items-center justify-center"}>
          <div className="rounded-[24px] border border-[#eee6ff] bg-white/94 px-5 py-4 text-center shadow-[0_18px_44px_rgba(101,73,214,0.12)]">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#ece4ff] border-t-[#7c5cff]" />
            <p className="mt-3 text-sm font-medium text-[#24154b]">Loading the live map preview…</p>
          </div>
        </div>
      ) : null}

      {showMapChrome ? (
        <div className={isFullscreen ? "absolute top-4 left-4 z-[2100] flex gap-2" : "absolute top-4 left-4 z-30 flex gap-2"}>
          <Button
            onClick={() => handleNearMe({ focus: true })}
            variant="secondary"
            size="sm"
            className="bg-white/90 hover:bg-white shadow-md"
          >
            <Navigation className="w-4 h-4 mr-1" />
            Near me
          </Button>

          {locationError && <div className="rounded-md bg-red-100 px-3 py-1 text-sm text-red-700">{locationError}</div>}

          {userLocation && <div className="rounded-md bg-green-100 px-3 py-1 text-sm text-green-700">Location found</div>}
        </div>
      ) : null}

      {showMapChrome ? (
        <div
          className={
            isFullscreen
              ? "absolute top-4 right-4 z-[2100] flex flex-col items-end gap-2"
              : "absolute top-4 right-4 z-30 flex flex-col items-end gap-2"
          }
        >
          <Button
            onClick={() => setIsFullscreen((v) => !v)}
            variant="secondary"
            size="icon"
            className="bg-white/90 hover:bg-white shadow-md"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>

          <div className="hidden rounded-lg bg-white/90 p-3 shadow-md md:block">
            <h4 className="mb-2 text-sm font-semibold">Event Types</h4>
            <div className="space-y-1 text-xs">
              {categoryConfig.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${c.colorClass}`}></div>
                  <span>{c.id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {(missingApiKey || mapLoadError) && (
        <div className={isFullscreen ? "absolute inset-0 z-[2100] flex items-center justify-center" : "absolute inset-0 z-30 flex items-center justify-center"}>
          <div className="mx-4 flex h-[calc(100%-2rem)] w-full max-w-3xl flex-col rounded-[28px] border border-[#eee6ff] bg-[radial-gradient(circle_at_top_right,rgba(124,92,255,0.14),transparent_30%),linear-gradient(180deg,#ffffff,#faf7ff)] p-5 shadow-[0_24px_60px_rgba(101,73,214,0.14)] sm:p-6">
            <div className="flex h-full flex-col justify-between gap-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-xl">
                  <div className="inline-flex items-center rounded-full border border-[#e8dcff] bg-white/92 px-4 py-2 text-sm font-medium text-[#6a5f8f] shadow-[0_10px_24px_rgba(101,73,214,0.06)]">
                    <MapPin className="mr-2 h-4 w-4 text-[#7c5cff]" />
                    Live map preview unavailable
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[#24154b]">
                    The event radar is falling back to quick picks for now.
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[#6a5f8f]">
                    The map is still being set up on this device, so the next few events are surfaced here instead.
                  </p>
                </div>
                <Badge className="self-start rounded-full bg-[#f6f1ff] px-3 py-1 text-[#5f43e5] shadow-none">
                  {fallbackEvents.length} picks
                </Badge>
              </div>

              {fallbackEvents.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {fallbackEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onEventClick?.(event)}
                      className="overflow-hidden rounded-[22px] border border-[#efe8ff] bg-white text-left shadow-[0_10px_24px_rgba(101,73,214,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(101,73,214,0.12)]"
                    >
                      <div className="relative h-24 bg-[#f7f3ff]">
                        <AppImage src={event.imageUrl} alt={event.title} fill sizes="(min-width: 640px) 30vw, 100vw" className="object-cover" />
                      </div>
                      <div className="space-y-2 px-4 py-4">
                        <Badge variant="secondary" className="rounded-full bg-[#f6f1ff] px-2.5 py-1 text-[#5f43e5] shadow-none">
                          {event.category}
                        </Badge>
                        <div className="line-clamp-2 text-sm font-semibold text-[#24154b]">{event.title}</div>
                        <div className="text-sm text-[#6a5f8f]">{event.city || getLocationString(event.location)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-[22px] border border-[#efe8ff] bg-white px-4 py-4 text-sm leading-7 text-[#6a5f8f]">
                  Event cards below will still update normally as the feed changes.
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs text-[#9a8fc2]">
                  Use the fallback cards here or scroll to the main event feed below for the full list.
                </p>
                {mapLoadError ? <p className="text-xs text-[#9a8fc2]">{mapLoadError}</p> : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {hoveredEvent && hoveredPoint && !missingApiKey && !mapLoadError && (
        <div
          className={isFullscreen ? "absolute z-[2200] pointer-events-auto" : "absolute z-40 pointer-events-auto"}
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
              clearHovered()
            }}
          >
            <div className="flex gap-3 p-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <AppImage src={hoveredEvent.imageUrl} alt={hoveredEvent.title} width={48} height={48} className="w-full h-full object-cover" />
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

      {events.length === 0 && !missingApiKey && !mapLoadError && (
        <div className={isFullscreen ? "absolute inset-0 z-[2100] flex items-center justify-center" : "absolute inset-0 z-30 flex items-center justify-center"}>
          <div className="text-center text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No events to display on map</p>
          </div>
        </div>
      )}
    </div>
  )
}
