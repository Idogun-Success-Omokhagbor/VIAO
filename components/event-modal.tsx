"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { X, Calendar, MapPin, Users, Clock, DollarSign, Heart, Share2, Zap, Crown, ChevronLeft, ChevronRight, FileDown } from "lucide-react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/context/auth-context"
import { useEvents } from "@/context/events-context"
import MessageUserButton from "@/components/message-user-button"
import PaymentModal from "@/components/payment-modal"
import { formatBoostCountdown } from "@/lib/utils"
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

function getBoostCountdownToneClass(boostUntil: string | null | undefined, now: number) {
  if (!boostUntil) return "bg-white/90 text-gray-900"
  const remainingMs = new Date(boostUntil).getTime() - now
  const remainingHours = remainingMs / 3_600_000
  if (remainingHours > 30) return "bg-emerald-600 text-white"
  if (remainingHours > 15) return "bg-amber-400 text-amber-950"
  return "bg-red-600 text-white"
}

function formatIcsDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  )
}

function sanitizeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
}

function getSafeImageSrc(src?: string | null) {
  if (!src) return "/placeholder.svg"
  return src
}

interface EventModalProps {
  event: Event
  onClose: () => void
}

export default function EventModal({ event, onClose }: EventModalProps) {
  const { user } = useAuth()
  const { rsvpEvent, setRsvpStatus, cancelRsvp, saveEvent, unsaveEvent, reportEvent } = useEvents()
  const effectiveBoostLevel = typeof event.boostLevel === "number" ? event.boostLevel : event.isBoosted ? 1 : 0
  const images = Array.isArray(event.imageUrls) && event.imageUrls.length > 0 ? event.imageUrls : event.imageUrl ? [event.imageUrl] : []
  const [imageIndex, setImageIndex] = useState(0)
  const [isRSVPed, setIsRSVPed] = useState(event.isGoing ?? false)
  const [isRsvpLoading, setIsRsvpLoading] = useState(false)
  const [rsvpStatus, setRsvpStatusState] = useState<Event["rsvpStatus"]>(event.rsvpStatus ?? (event.isGoing ? "GOING" : null))
  const [isSaved, setIsSaved] = useState(event.isSaved ?? false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [boostLevel, setBoostLevel] = useState<0 | 1 | 2>(0)

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
  const boostCountdown = formatBoostCountdown(event.boostUntil, nowTick)
  const countdownToneClass = getBoostCountdownToneClass(event.boostUntil, nowTick)

  useEffect(() => {
    setIsRSVPed(event.isGoing ?? false)
    setRsvpStatusState(event.rsvpStatus ?? (event.isGoing ? "GOING" : null))
    setIsSaved(event.isSaved ?? false)
    setImageIndex(0)
  }, [event.isGoing, event.rsvpStatus, event.isSaved])

  const handleRSVP = async () => {
    if (!user) return
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
    const start = new Date((event.startsAt ?? event.date) as any)
    const end = event.endsAt ? new Date(event.endsAt as any) : new Date(start.getTime() + 2 * 60 * 60 * 1000)
    const now = new Date()
    const uid = `${event.id}@viao`

    const ics =
      "BEGIN:VCALENDAR\r\n" +
      "VERSION:2.0\r\n" +
      "PRODID:-//Viao//My Events//EN\r\n" +
      "CALSCALE:GREGORIAN\r\n" +
      "METHOD:PUBLISH\r\n" +
      "BEGIN:VEVENT\r\n" +
      `UID:${sanitizeIcsText(uid)}\r\n` +
      `DTSTAMP:${formatIcsDate(now)}\r\n` +
      `DTSTART:${formatIcsDate(start)}\r\n` +
      `DTEND:${formatIcsDate(end)}\r\n` +
      `SUMMARY:${sanitizeIcsText(event.title)}\r\n` +
      `DESCRIPTION:${sanitizeIcsText(event.description || "")}\r\n` +
      `LOCATION:${sanitizeIcsText(event.location || "")}\r\n` +
      "END:VEVENT\r\n" +
      "END:VCALENDAR\r\n"

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${event.title.replace(/[^a-z0-9\-_ ]/gi, "").slice(0, 60) || "event"}.ics`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handleSetStatus = async (status: "GOING" | "MAYBE" | "NOT_GOING") => {
    if (!user) return
    setIsRsvpLoading(true)
    try {
      await setRsvpStatus(event.id, status)
      setRsvpStatusState(status)
      setIsRSVPed(status === "GOING")
    } catch (error) {
      console.error("RSVP status error:", error)
    } finally {
      setIsRsvpLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return
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
    const eventUrl = `${window.location.origin}/events/${event.id}`
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

  const handleBoost = (level: 1 | 2) => {
    if (!isEventOrganizer) return
    setBoostLevel(level)
    setShowPaymentModal(true)
  }

  const handleOpenBoost = () => {
    if (!isEventOrganizer) return
    setBoostLevel(0)
    setShowPaymentModal(true)
  }


  const handleOpenReport = () => {
    if (!user) return
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
            <img
              src={getSafeImageSrc(images[imageIndex] ?? event.imageUrl)}
              alt={event.title}
              className="w-full h-full object-cover"
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
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl md:text-3xl mb-2">{event.title}</CardTitle>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline">
                  <span
                    className={`inline-block h-3 w-3 rounded-full mr-2 ${CATEGORY_COLORS[event.category] || "bg-gray-400"}`}
                  />
                  {event.category}
                </Badge>
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-1" />
                  {event.attendeesCount ?? 0}/{event.maxAttendees || "∞"} attending
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                className={isSaved ? "text-red-600 border-red-600" : ""}
              >
                <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
              {!isEventOrganizer && (
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
            <div className="flex items-center text-gray-600">
              <MapPin className="h-4 w-4 mr-2" />
              {event.location}
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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={event.organizerAvatarUrl ?? undefined} />
                  <AvatarFallback>{(event.organizerName || "O").slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{event.organizerName ?? "Organizer"}</p>
                  <p className="text-sm text-gray-600">Event Organizer</p>
                </div>
              </div>
              {!isEventOrganizer && event.organizerId && (
                <MessageUserButton userId={event.organizerId} userName={event.organizerName ?? "Organizer"} />
              )}
            </div>
          </div>

          {/* RSVP Section */}
          {!isEventOrganizer && (
            <div className="border-t pt-6">
              {isCancelled && (
                <div className="bg-gray-100 border border-gray-200 text-gray-800 px-3 py-2 rounded mb-4">
                  This event has been cancelled.
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleRSVP}
                  className={`flex-1 ${
                    isRSVPed ? "bg-green-600 hover:bg-green-700" : "bg-purple-600 hover:bg-purple-700"
                  }`}
                  disabled={isRsvpLoading || isCancelled}
                >
                  {isRsvpLoading ? "Processing..." : rsvpStatus === "GOING" ? "✓ You&apos;re Going!" : "RSVP to Event"}
                </Button>

                {rsvpStatus === "GOING" ? (
                  <Button
                    variant="outline"
                    onClick={handleAddToCalendar}
                    disabled={isCancelled}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Add to calendar
                  </Button>
                ) : null}
              </div>

              {isRSVPed && (
                <p className="text-sm text-green-600 mt-2 text-center">
                  Great! We&apos;ll send you event updates and reminders.
                </p>
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
