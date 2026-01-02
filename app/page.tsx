"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Calendar, MapPin, Search } from "lucide-react"

import { useAuth } from "@/context/auth-context"
import type { Event } from "@/types/event"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { AIAssistantWidget } from "@/components/ai-assistant-widget"

type SiteConfig = {
  maintenanceMode?: boolean
  announcement?: string
}

type EventsResponse = {
  events?: Event[]
  error?: string
}

type SiteConfigResponse = {
  config?: SiteConfig
  error?: string
}

function getErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined
  const msg = (payload as { error?: unknown }).error
  return typeof msg === "string" ? msg : undefined
}

function getSafeImageSrc(src?: string | null) {
  if (!src) return "/placeholder.svg"
  return src
}

function formatPriceChf(price: number | null | undefined) {
  if (price === 0) return "Free"
  if (typeof price === "number") return `CHF ${price}`
  return "Free"
}

export default function HomePage() {
  const { user, showAuthModal } = useAuth()
  const router = useRouter()

  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null)

  const [q, setQ] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("ALL")

  useEffect(() => {
    if (user) {
      router.push("/dashboard")
    }
  }, [user, router])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/events", { cache: "no-store", credentials: "include" })
        const json = (await res.json().catch(() => null)) as unknown
        if (!res.ok) throw new Error(getErrorMessage(json) || "Failed to load events")
        const next = (json && typeof json === "object" ? (json as EventsResponse) : null)?.events
        const list = Array.isArray(next) ? next : []
        if (!cancelled) setEvents(list)
      } catch (e) {
        if (!cancelled) {
          setEvents([])
          setError(e instanceof Error ? e.message : "Failed to load events")
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch("/api/site-config", { cache: "no-store", credentials: "include" })
        const json = (await res.json().catch(() => null)) as unknown
        if (!res.ok) throw new Error(getErrorMessage(json) || "Failed to load site configuration")
        const config = (json && typeof json === "object" ? (json as SiteConfigResponse) : null)?.config
        if (!cancelled) setSiteConfig(config ?? null)
      } catch {
        if (!cancelled) setSiteConfig(null)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of events) {
      const c = typeof e.category === "string" && e.category.trim() ? e.category.trim() : "Other"
      counts.set(c, (counts.get(c) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [events])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return events
      .filter((e) => !query || (e.title ?? "").toLowerCase().includes(query) || (e.description ?? "").toLowerCase().includes(query))
      .filter((e) => activeCategory === "ALL" || (e.category ?? "") === activeCategory)
      .filter((e) => !e.isCancelled)
  }, [activeCategory, events, q])

  const featured = filtered.slice(0, 6)
  const stats = useMemo(() => {
    const cities = new Set<string>()
    const categories = new Set<string>()
    let upcoming = 0
    const now = Date.now()

    for (const e of events) {
      const category = typeof e.category === "string" && e.category.trim() ? e.category.trim() : ""
      if (category) categories.add(category)
      const city = typeof e.city === "string" && e.city.trim() ? e.city.trim() : ""
      if (city) cities.add(city)
      const when = new Date(e.startsAt ?? e.date).getTime()
      if (!Number.isNaN(when) && when >= now && !e.isCancelled) upcoming += 1
    }

    return {
      upcoming,
      cities: cities.size,
      categories: categories.size,
    }
  }, [events])

  if (user) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {siteConfig?.maintenanceMode ? (
        <div className="border-b bg-amber-50 px-6 py-2 text-sm text-amber-900">
          {siteConfig.announcement?.trim() ? siteConfig.announcement : "The site is currently in maintenance mode."}
        </div>
      ) : null}
      <main>
        <section className="relative overflow-hidden border-b bg-white">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-purple-500/10 via-fuchsia-500/10 to-blue-500/10 blur-3xl" />
            <div className="absolute -bottom-40 right-[-120px] h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 blur-3xl" />
          </div>

          <div className="container relative mx-auto px-6 py-16 md:py-24">
            <div className="mx-auto max-w-5xl">
              <div className="text-center">
                <Badge variant="secondary" className="mb-5 bg-white/60 backdrop-blur border border-white/40 text-gray-800">
                  Discover events near you
                </Badge>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900">
                  Your next experience
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-indigo-700"> starts here</span>
                </h1>
                <p className="mt-4 text-lg md:text-xl text-gray-600">
                  Search by title, browse by category, and join what’s happening.
                </p>

                <div className="mt-8 mx-auto max-w-3xl">
                  <Card className="bg-white/60 backdrop-blur-xl border-white/40 shadow-lg shadow-purple-500/5">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <Input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search events..."
                            className="pl-10 bg-white/90 border-gray-200"
                          />
                        </div>
                        <Button
                          className="bg-gray-900 text-white hover:bg-gray-800"
                          onClick={() => showAuthModal("signup")}
                        >
                          Get started
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Card className="bg-white/60 backdrop-blur border-white/40">
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Upcoming events</div>
                      <div className="text-2xl font-semibold text-gray-900">{stats.upcoming.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/60 backdrop-blur border-white/40">
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Categories</div>
                      <div className="text-2xl font-semibold text-gray-900">{stats.categories.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/60 backdrop-blur border-white/40">
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground">Cities</div>
                      <div className="text-2xl font-semibold text-gray-900">{stats.cities.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="mt-10 flex flex-wrap justify-center gap-2">
                <Button
                  size="sm"
                  variant={activeCategory === "ALL" ? "secondary" : "outline"}
                  className={
                    activeCategory === "ALL"
                      ? "bg-gray-900 text-white hover:bg-gray-800"
                      : "bg-white/60 backdrop-blur border-white/40 hover:bg-purple-50"
                  }
                  onClick={() => setActiveCategory("ALL")}
                >
                  All
                </Button>
                {categories.slice(0, 10).map((c) => (
                  <Button
                    key={c.name}
                    size="sm"
                    variant={activeCategory === c.name ? "secondary" : "outline"}
                    className={
                      activeCategory === c.name
                        ? "bg-gray-900 text-white hover:bg-gray-800"
                        : "bg-white/60 backdrop-blur border-white/40 hover:bg-purple-50"
                    }
                    onClick={() => setActiveCategory(c.name)}
                  >
                    {c.name}
                    <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs text-gray-700">{c.count}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20 bg-gradient-to-b from-white to-slate-50">
          <div className="container mx-auto px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">Events</h2>
                <p className="text-muted-foreground">Browse what’s happening</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="bg-white/60 backdrop-blur border-white/40 hover:bg-purple-50" asChild>
                  <Link href="/community">Explore community</Link>
                </Button>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="h-48 bg-gray-200 animate-pulse" />
                    <CardHeader>
                      <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                    </CardHeader>
                    <CardContent>
                      <div className="h-9 w-full bg-gray-200 rounded animate-pulse" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : featured.length === 0 ? (
              <div className="rounded-lg border bg-white p-8 text-center">
                <div className="text-lg font-semibold">No events found</div>
                <div className="mt-1 text-sm text-muted-foreground">Try clearing filters or searching a different keyword.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featured.map((event) => (
                  <Card
                    key={event.id}
                    className="overflow-hidden bg-white/70 backdrop-blur border-white/40 transition-all duration-200 hover:shadow-xl hover:-translate-y-1 hover:bg-purple-50/40"
                  >
                    <div className="relative">
                      <img
                        src={getSafeImageSrc(
                          event.imageUrls && event.imageUrls.length > 0 ? event.imageUrls[0] : (event.imageUrl ?? null),
                        )}
                        alt={event.title}
                        className="w-full h-48 object-cover"
                      />
                      <Badge className="absolute top-3 left-3 bg-white/80 backdrop-blur text-gray-900 border border-white/40">{event.category}</Badge>
                      {event.isBoosted && (
                        <Badge className="absolute top-3 right-3 bg-gray-900 text-white">Boosted</Badge>
                      )}
                    </div>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
                        <div className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                          {formatPriceChf(event.price ?? null)}
                        </div>
                      </div>
                      <CardDescription className="line-clamp-2">{event.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(event.startsAt ?? event.date).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{event.city || event.location}</span>
                        </div>
                      </div>
                      {user ? (
                        <Button className="w-full bg-gray-900 text-white hover:bg-gray-800" asChild>
                          <Link href={`/events/${event.id}`}>View</Link>
                        </Button>
                      ) : (
                        <Button
                          className="w-full bg-gray-900 text-white hover:bg-gray-800"
                          onClick={() => showAuthModal("login")}
                        >
                          View
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="py-14 md:py-20 bg-white">
          <div className="container mx-auto px-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-8">
              <div>
                <h3 className="text-xl md:text-2xl font-semibold">Browse by category</h3>
                <p className="text-muted-foreground">Tap a category to filter instantly</p>
              </div>
              <Button
                variant="outline"
                className="bg-white/60 backdrop-blur border-white/40 hover:bg-purple-50"
                onClick={() => {
                  setActiveCategory("ALL")
                  setQ("")
                }}
              >
                Clear filters
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.slice(0, 12).map((c) => {
                const active = activeCategory === c.name
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setActiveCategory(c.name)}
                    className={
                      "text-left rounded-lg border p-4 transition-all duration-200 bg-white/60 backdrop-blur border-white/40 hover:bg-purple-50/60 hover:shadow-md" +
                      (active ? " ring-2 ring-purple-200" : "")
                    }
                  >
                    <div className="text-sm font-medium text-gray-900 truncate">{c.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{c.count.toLocaleString()} events</div>
                  </button>
                )
              })}
            </div>

            <Card className="mt-10 bg-white/70 backdrop-blur-xl border-white/40">
              <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-gray-900">Ready to join an event?</div>
                  <div className="text-sm text-muted-foreground">Sign in to view details and RSVP.</div>
                </div>
                <div className="flex gap-2">
                  <Button className="bg-gray-900 text-white hover:bg-gray-800" onClick={() => showAuthModal("login")}>
                    Sign in
                  </Button>
                  <Button variant="outline" className="bg-white/60 backdrop-blur border-white/40 hover:bg-purple-50" onClick={() => showAuthModal("signup")}>
                    Create account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
      <AIAssistantWidget />
    </div>
  )
}
