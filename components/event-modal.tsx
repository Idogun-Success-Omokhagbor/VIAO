"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { AppImage } from "@/components/ui/app-image"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { X, Calendar, MapPin, Users, Clock, DollarSign, Heart, Share2, Zap, Crown, ChevronLeft, ChevronRight, FileDown } from "lucide-react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/context/auth-context"
import { useOptionalEvents } from "@/context/events-context"
import MessageUserButton from "@/components/message-user-button"
import type { PaymentModalProps } from "@/components/payment-modal"
import { formatBoostCountdown, getBoostCountdownToneClass } from "@/lib/utils"
import { getEventCategoryColor } from "@/lib/event-categories"
import type { Event } from "@/types/event"

const PaymentModal = dynamic<PaymentModalProps>(() => import("@/components/payment-modal"), { ssr: false })

export interface EventModalProps {
  event: Event
  onClose: () => void
}

async function requestEventAction(resPromise: Promise<Response>) {
  const res = await resPromise
  if (!res.ok) {
    let message = "Request failed"
    try {
      const data = await res.json()
      if (typeof data?.error === "string" && data.error.trim()) {
        message = data.error
      }
    } catch {
      // ignore JSON parse errors for empty bodies
    }
    throw new Error(message)
  }
}

export default function EventModal({ event, onClose }: EventModalProps) {
  const { user, openAuthPage } = useAuth()
  const events = useOptionalEvents()
  const effectiveBoostLevel = typeof event.boostLevel === "number" ? event.boostLevel : event.isBoosted ? 1 : 0
  const images = Array.isArray(event.imageUrls) && event.imageUrls.length > 0 ? event.imageUrls : event.imageUrl ? [event.imageUrl] : []
  const [imageIndex, setImageIndex] = useState(0)
  const [isRSVPed, setIsRSVPed] = useState(event.isGoing ?? false)
  const [isRsvpLoading, setIsRsvpLoading] = useState(false)
  const [rsvpStatus, setRsvpStatusState] = useState<Event["rsvpStatus"]>(event.rsvpStatus ?? (event.isGoing ? "GOING" : null))
  const [isSaved, setIsSaved] = useState(event.isSaved ?? false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [boostLevel, setBoostLevel] = useState<0 | 1 | 2>(0)
  const [isCalendarLoading, setIsCalendarLoading] = useState(false)

  const [nowTick, setNowTick] = useState(() => Date.now())

  useEffect(() => {
    const t = window.setInterval(() => setNowTick(Date.now()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportReason, setReportReason] = useState<string>("SCAM_OR_FRAUD")
  const [reportDetails, setReportDetails] = useState<string>("")
  const [isReporting, setIsReporting] = useState(false)
  const [reportSubmitted, setReportSubmitted] = useState(false)

  const isEventOrganizer = user?.role === "ORGANIZER" && user?.id === event.organizerId
  const isCancelled = event.isCancelled ?? false
  const isPublicPreviewAvailable =
    event.status === "PUBLISHED" &&
    !isCancelled &&
    new Date(event.endsAt ?? event.startsAt ?? event.date).getTime() >= Date.now()
  const boostCountdown = formatBoostCountdown(event.boostUntil, nowTick)
  const countdownToneClass = getBoostCountdownToneClass(event.boostUntil, nowTick)
  const rsvpEvent =
    events?.rsvpEvent ??
    (async (id: string) =>
      requestEventAction(fetch(`/api/events/${id}/rsvp`, { method: "POST", credentials: "include" })))
  const cancelRsvp =
    events?.cancelRsvp ??
    (async (id: string) =>
      requestEventAction(fetch(`/api/events/${id}/rsvp`, { method: "DELETE", credentials: "include" })))
  const saveEvent =
    events?.saveEvent ??
    (async (id: string) =>
      requestEventAction(fetch(`/api/events/${id}/save`, { method: "POST", credentials: "include" })))
  const unsaveEvent =
    events?.unsaveEvent ??
    (async (id: string) =>
      requestEventAction(fetch(`/api/events/${id}/save`, { method: "DELETE", credentials: "include" })))
  const reportEvent =
    events?.reportEvent ??
    (async (id: string, reason: string, details?: string) =>
      requestEventAction(
        fetch(`/api/events/${id}/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ reason, details }),
        }),
      ))

  useEffect(() => {
    setIsRSVPed(event.isGoing ?? false)
    setRsvpStatusState(event.rsvpStatus ?? (event.isGoing ? "GOING" : null))
    setIsSaved(event.isSaved ?? false)
    setImageIndex(0)
  }, [event.isGoing, event.rsvpStatus, event.isSaved])

  const handleRSVP = async () => {
    if (!user) {
      openAuthPage("signup")
      return
    }
    setIsRsvpLoading(true)
    try {
      if (rsvpStatus === "GOING") {
        await cancelRsvp(event.id)
        setIsRSVPed(false)
        setRsvpStatusState(null)
      } else {
        await rsvpEvent(event.id)
        setIsRSVPed(true)
        setRsvpStatusState("GOING")
      }
    } catch (error) {
      console.error("RSVP error:", error)
    } finally {
      setIsRsvpLoading(false)
    }
  }

  const handleAddToCalendar = () => {
    if (isCalendarLoading) return
    setIsCalendarLoading(true)

    const url = `/api/events/${encodeURIComponent(event.id)}/calendar`
    try {
      window.location.assign(url)
    } catch {
      const a = document.createElement("a")
      a.href = url
      a.rel = "noopener"
      a.target = "_self"
      document.body.appendChild(a)
      a.click()
      a.remove()
    }

    window.setTimeout(() => {
      setIsCalendarLoading(false)
    }, 1200)
  }

  const handleSave = async () => {
    if (!user) {
      openAuthPage("signup")
      return
    }
    try {
      if (isSaved) {
        await unsaveEvent(event.id)
        setIsSaved(false)
      } else {
        await saveEvent(event.id)
        setIsSaved(true)
      }
    } catch (error) {
      console.error("Save event error:", error)
    }
  }

  const handleShare = () => {
    const eventUrl = isPublicPreviewAvailable
      ? `${window.location.origin}/event/${encodeURIComponent(event.id)}`
      : `${window.location.origin}/events/${event.id}`
    const fallbackCopy = async () => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(eventUrl)
          return
        }
      } catch {
      }
      try {
        window.prompt("Copy this link", eventUrl)
      } catch {
      }
    }

    if (navigator.share) {
      Promise.resolve(
        navigator.share({
          title: event.title,
          text: event.description,
          url: eventUrl,
        }),
      ).catch(() => {
        void fallbackCopy()
      })
      return
    }

    void fallbackCopy()
  }

  const handleOpenBoost = () => {
    if (!isEventOrganizer) return
    setBoostLevel(0)
    setShowPaymentModal(true)
  }


  const handleOpenReport = () => {
    if (!user) {
      openAuthPage("login")
      return
    }
    setReportSubmitted(false)
    setReportDetails("")
    setReportReason("SCAM_OR_FRAUD")
    setShowReportDialog(true)
  }

  const handleSubmitReport = async () => {
    if (!user) return
    setIsReporting(true)
    try {
      const reasonLabel =
        reportReason === "SCAM_OR_FRAUD"
          ? "Scam or fraud"
          : reportReason === "HARASSMENT_OR_HATE"
            ? "Harassment or hate"
            : reportReason === "INAPPROPRIATE_CONTENT"
              ? "Inappropriate content"
              : reportReason === "MISLEADING_INFORMATION"
                ? "Misleading information"
                : "Other"

      await reportEvent(event.id, reasonLabel, reportDetails.trim() || undefined)
      setReportSubmitted(true)
    } catch (err) {
      console.error("Report event failed", err)
    } finally {
      setIsReporting(false)
    }
  }

  return (
    <>
      <Card className="w-full bg-white">
        {/* Header with close button */}
        <div className="sticky top-0 z-20 flex justify-end p-4 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <button
            type="button"
            onClick={onClose}
            className="bg-white/90 hover:bg-white rounded-full p-2 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative">
          {/* Hero Image */}
          <div className="relative h-64 md:h-80 overflow-hidden rounded-t-lg">
            <AppImage
              src={images[imageIndex] ?? event.imageUrl}
              alt={event.title}
              fill
              sizes="100vw"
              className="object-cover"
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition-colors"
                >
                  <span className="sr-only">Previous image</span>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageIndex((prev) => (prev + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition-colors"
                >
                  <span className="sr-only">Next image</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {isCancelled && (
              <div className="absolute top-4 right-4">
                <Badge className="bg-gray-900 text-white">Cancelled</Badge>
              </div>
            )}

            {/* Boost Badge */}
            {event.isBoosted && (
              <div className="absolute top-4 left-4 flex items-center gap-2">
                {isEventOrganizer ? (
                  <>
                    {effectiveBoostLevel >= 2 ? (
                      <Badge className="bg-purple-600 text-white">
                        <Crown className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-400 text-yellow-800">
                        <Zap className="w-3 h-3 mr-1" />
                        Boosted
                      </Badge>
                    )}

                    {!isCancelled && boostCountdown ? <Badge className={countdownToneClass}>{boostCountdown}</Badge> : null}
                  </>
                ) : (
                  <Badge className="bg-yellow-400 text-yellow-900">Featured</Badge>
                )}
              </div>
            )}

            {/* Price Badge */}
            <div className="absolute bottom-4 right-4">
              <Badge variant="secondary" className="bg-white/90 text-gray-800 text-lg font-bold">
                {event.price === 0 ? "Free" : `CHF ${event.price}`}
              </Badge>
            </div>
          </div>
        </div>

        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl md:text-3xl mb-2">{event.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge variant="outline">
                  <span className={`inline-block h-3 w-3 rounded-full mr-2 ${getEventCategoryColor(event.category)}`} />
                  {event.category}
                </Badge>
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-1" />
                  {event.attendeesCount ?? 0}/{event.maxAttendees || "∞"} attending
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 sm:ml-4">
              {user ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  className={isSaved ? "text-red-600 border-red-600" : ""}
                >
                  <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
              {user && !isEventOrganizer && (
                <Button variant="outline" size="sm" onClick={handleOpenReport}>
                  Report
                </Button>
              )}
            </div>
          </div>

          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              {new Date(event.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
            <div className="flex items-center text-gray-600">
              <Clock className="h-4 w-4 mr-2" />
              {event.time}
            </div>
            <div className="flex items-center text-gray-600 min-w-0">
              <MapPin className="h-4 w-4 mr-2" />
              <span className="break-words">{event.location}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <DollarSign className="h-4 w-4 mr-2" />
              {event.price === 0 ? "Free Event" : `CHF ${event.price}`}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">About this event</h3>
            <p className="text-gray-600 leading-relaxed">{event.description}</p>
          </div>

          {/* Organizer */}
          <div>
            <h3 className="font-semibold mb-3">Organized by</h3>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center space-x-3">
                <Avatar>
                  <AvatarImage src={event.organizerAvatarUrl ?? undefined} />
                  <AvatarFallback>{(event.organizerName || "O").slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium break-words">{event.organizerName ?? "Organizer"}</p>
                  <p className="text-sm text-gray-600">Event Organizer</p>
                </div>
              </div>
              {!isEventOrganizer && event.organizerId && (
                <MessageUserButton
                  userId={event.organizerId}
                  userName={event.organizerName ?? "Organizer"}
                  size="default"
                  className="w-full lg:w-auto whitespace-normal text-center"
                />
              )}
            </div>
          </div>

          {/* RSVP Section */}
          {!isEventOrganizer && (
            <div className="border-t pt-6">
              {!user ? (
                <div className="rounded-2xl border border-[#e8dcff] bg-[#faf7ff] px-4 py-4">
                  <p className="text-sm font-semibold text-[#24154b]">Browse first, then join when it feels worth keeping.</p>
                  <p className="mt-2 text-sm leading-7 text-[#6a5f8f]">
                    Create an account to save this event, RSVP, message the organizer, and get updates if the plan turns into a real yes.
                  </p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button type="button" onClick={() => openAuthPage("signup")} className="flex-1 min-h-11 whitespace-normal text-center bg-purple-600 hover:bg-purple-700">
                      Create account to RSVP
                    </Button>
                    <Button type="button" variant="outline" onClick={() => openAuthPage("login")} className="min-h-11 whitespace-normal text-center">
                      I already have an account
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {isCancelled && (
                    <div className="bg-gray-100 border border-gray-200 text-gray-800 px-3 py-2 rounded mb-4">
                      This event has been cancelled.
                    </div>
                  )}
                  <div className="flex flex-col gap-3 lg:flex-row">
                    <Button
                      type="button"
                      onClick={handleRSVP}
                      className={`flex-1 min-h-11 whitespace-normal text-center ${
                        isRSVPed ? "bg-green-600 hover:bg-green-700" : "bg-purple-600 hover:bg-purple-700"
                      }`}
                      disabled={isRsvpLoading || isCancelled}
                    >
                      {isRsvpLoading ? "Processing..." : rsvpStatus === "GOING" ? "✓ You're Going!" : "RSVP to Event"}
                    </Button>

                    {rsvpStatus === "GOING" ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddToCalendar}
                        className="min-h-11 whitespace-normal text-center"
                        disabled={isCancelled || isCalendarLoading}
                      >
                        <FileDown className="h-4 w-4 mr-2" />
                        {isCalendarLoading ? "Adding..." : "Add to Calendar"}
                      </Button>
                    ) : null}
                  </div>

                  {isRSVPed && (
                    <p className="text-sm text-green-600 mt-2 text-center">
                      Great! We'll send you event updates and reminders.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {isEventOrganizer ? (
            <div className="border-t pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={handleOpenBoost}
                  className="border-purple-500 text-purple-600 hover:bg-purple-50"
                  disabled={isCancelled}
                >
                  <Crown className="h-4 w-4 mr-1" />
                  Boost
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          eventId={event.id}
          eventTitle={event.title}
          boostLevel={boostLevel}
        />
      )}

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report event</DialogTitle>
          </DialogHeader>

          {reportSubmitted ? (
            <div className="text-sm text-gray-700">
              Thanks for your report — our team will review it shortly.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Why are you reporting this event?</Label>
                <RadioGroup value={reportReason} onValueChange={setReportReason}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="SCAM_OR_FRAUD" id="report-scam" />
                    <Label htmlFor="report-scam">Scam or fraud</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="HARASSMENT_OR_HATE" id="report-harassment" />
                    <Label htmlFor="report-harassment">Harassment or hate</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="INAPPROPRIATE_CONTENT" id="report-inappropriate" />
                    <Label htmlFor="report-inappropriate">Inappropriate content</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="MISLEADING_INFORMATION" id="report-misleading" />
                    <Label htmlFor="report-misleading">Misleading information</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="OTHER" id="report-other" />
                    <Label htmlFor="report-other">Other</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="report-details">Additional details (optional)</Label>
                <Textarea
                  id="report-details"
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Share anything that helps us understand what happened..."
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {reportSubmitted ? (
              <Button type="button" onClick={() => setShowReportDialog(false)}>
                Done
              </Button>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setShowReportDialog(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSubmitReport} disabled={isReporting}>
                  {isReporting ? "Submitting..." : "Submit report"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  )
}
