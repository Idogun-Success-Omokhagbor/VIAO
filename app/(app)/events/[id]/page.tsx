"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Compass } from "lucide-react"

import { Button } from "@/components/ui/button"

import type { EventModalProps } from "@/components/event-modal"
import type { Event } from "@/types/event"

const EventModal = dynamic<EventModalProps>(() => import("@/components/event-modal"), { ssr: false })

export default function EventDeepLinkPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const from = searchParams?.get("from")

  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fallbackHref = from === "plans" ? "/my-events" : "/discover"

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
      return
    }
    router.replace(fallbackHref)
  }

  useEffect(() => {
    if (!id) return

    let didCancel = false

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const res = await fetch(`/api/events/${id}`, { cache: "no-store" })
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(data?.error || "Failed to load event")

        if (!didCancel) {
          setEvent(data?.event ?? null)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load event"
        if (!didCancel) setError(message)
      } finally {
        if (!didCancel) setIsLoading(false)
      }
    }

    load()

    return () => {
      didCancel = true
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    const payment = searchParams?.get("payment")
    if (payment !== "success") return

    let didCancel = false
    ;(async () => {
      try {
        const res = await fetch(`/api/events/${id}`, { cache: "no-store" })
        const data = await res.json().catch(() => null)
        if (!res.ok) return
        if (!didCancel) setEvent(data?.event ?? null)
      } finally {
        if (!didCancel) {
          router.replace(from ? `/events/${id}?from=${encodeURIComponent(from)}` : `/events/${id}`)
        }
      }
    })()

    return () => {
      didCancel = true
    }
  }, [from, id, router, searchParams])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading event...</div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-gray-900 font-semibold">Event not available</div>
          <div className="text-gray-600 text-sm">{error ?? "Not found"}</div>
          <button
            className="text-sm text-purple-700 hover:underline"
            onClick={handleBack}
            type="button"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f4efff,transparent_24%),radial-gradient(circle_at_bottom_right,#eef8ff,transparent_28%),linear-gradient(180deg,#ffffff,#faf7ff)]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" onClick={handleBack} className="w-fit rounded-full border-[#ddd1ff] bg-white/85 text-[#5e4ea6] hover:bg-[#f6f1ff]">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <Button asChild variant="ghost" className="w-fit rounded-full text-[#5e4ea6] hover:bg-[#f6f1ff]">
            <Link href={fallbackHref}>
              <Compass className="mr-2 h-4 w-4" />
              Browse more plans
            </Link>
          </Button>
        </div>

        <div className="overflow-hidden rounded-[30px] border border-[#ece4ff] bg-white shadow-[0_24px_60px_rgba(76,53,160,0.08)]">
          <EventModal event={event} onClose={handleBack} showCloseButton={false} />
        </div>
      </div>
    </div>
  )
}

