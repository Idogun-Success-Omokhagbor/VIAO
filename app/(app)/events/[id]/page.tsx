"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"

import EventModal from "@/components/event-modal"
import type { Event } from "@/types/event"

export default function EventDeepLinkPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          router.replace(`/events/${id}`)
        }
      }
    })()

    return () => {
      didCancel = true
    }
  }, [id, router, searchParams])

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
            onClick={() => router.push("/events")}
            type="button"
          >
            Back to Events
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <EventModal event={event} onClose={() => router.push("/events")} />
        </div>
      </div>
    </div>
  )
}
