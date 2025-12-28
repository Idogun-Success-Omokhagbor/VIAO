"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { X, Calendar, MapPin, Users, Clock, DollarSign, Heart, Share2, Zap, Crown } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useEvents } from "@/context/events-context"
import MessageUserButton from "@/components/message-user-button"
import PaymentModal from "@/components/payment-modal"
import type { Event } from "@/types/event"

interface EventModalProps {
  event: Event
  onClose: () => void
}

export default function EventModal({ event, onClose }: EventModalProps) {
  const { user } = useAuth()
  const { rsvpEvent, cancelRsvp, boostEvent, deleteEvent, updateEvent } = useEvents()
  const [isRSVPed, setIsRSVPed] = useState(event.isGoing ?? false)
  const [isRsvpLoading, setIsRsvpLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [boostLevel, setBoostLevel] = useState<1 | 2>(1)
  const [isEditing, setIsEditing] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [form, setForm] = useState({
    title: event.title,
    description: event.description,
    date: event.date.split("T")[0],
    time: event.time || "",
    location: typeof event.location === "string" ? event.location : "",
    price: event.price ?? 0,
    maxAttendees: event.maxAttendees ?? "",
  })

  useEffect(() => {
    setIsRSVPed(event.isGoing ?? false)
  }, [event.isGoing])

  const handleRSVP = async () => {
    if (!user) return
    setIsRsvpLoading(true)
    try {
      if (isRSVPed) {
        await cancelRsvp(event.id)
        setIsRSVPed(false)
      } else {
        await rsvpEvent(event.id)
        setIsRSVPed(true)
      }
    } catch (error) {
      console.error("RSVP error:", error)
    } finally {
      setIsRsvpLoading(false)
    }
  }

  const handleSave = () => {
    setIsSaved(!isSaved)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.description,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  const handleBoost = (level: 1 | 2) => {
    if (!isEventOrganizer) return
    setBoostLevel(level)
    setShowPaymentModal(true)
  }

  const handleDelete = async () => {
    if (!user || user.id !== event.organizerId) return
    await deleteEvent(event.id)
    onClose()
  }

  const handleEditSave = async () => {
    if (!user || user.id !== event.organizerId) return
    setEditLoading(true)
    try {
      await updateEvent(event.id, {
        title: form.title,
        description: form.description,
        date: new Date(form.date).toISOString(),
        time: form.time,
        location: form.location,
        price: form.price ?? undefined,
        maxAttendees: form.maxAttendees === "" ? null : Number(form.maxAttendees),
      })
      setIsEditing(false)
    } catch (err) {
      console.error("Edit event failed", err)
    } finally {
      setEditLoading(false)
    }
  }

  const isEventOrganizer = user?.role === "ORGANIZER" && user?.id === event.organizerId

  return (
    <>
      <Card className="w-full bg-white">
        {/* Header with close button */}
        <div className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white rounded-full p-2 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Hero Image */}
          <div className="relative h-64 md:h-80 overflow-hidden rounded-t-lg">
            <img src={event.imageUrl || "/placeholder.svg"} alt={event.title} className="w-full h-full object-cover" />

            {/* Boost Badge */}
            {event.isBoosted && (
              <div className="absolute top-4 left-4">
                <Badge className="bg-yellow-400 text-yellow-800">
                  <Zap className="w-3 h-3 mr-1" />
                  Boosted
                </Badge>
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
                <Badge variant="outline">{event.category}</Badge>
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
            </div>
          </div>

          {/* Event Details */}
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <label className="flex flex-col gap-1 text-gray-700">
                <span className="text-xs font-semibold">Title</span>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1 text-gray-700">
                <span className="text-xs font-semibold">Date</span>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1 text-gray-700">
                <span className="text-xs font-semibold">Time</span>
                <Input value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1 text-gray-700">
                <span className="text-xs font-semibold">Location</span>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1 text-gray-700">
                <span className="text-xs font-semibold">Price (CHF)</span>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                />
              </label>
              <label className="flex flex-col gap-1 text-gray-700">
                <span className="text-xs font-semibold">Max Attendees</span>
                <Input
                  type="number"
                  value={form.maxAttendees as any}
                  onChange={(e) => setForm({ ...form, maxAttendees: e.target.value })}
                  placeholder="Unlimited"
                />
              </label>
            </div>
          ) : (
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
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">About this event</h3>
            {isEditing ? (
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            ) : (
              <p className="text-gray-600 leading-relaxed">{event.description}</p>
            )}
          </div>

          {/* Organizer */}
          <div>
            <h3 className="font-semibold mb-3">Organized by</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback>{event.organizerName?.charAt(0) || "O"}</AvatarFallback>
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
          <div className="border-t pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleRSVP}
                className={`flex-1 ${
                  isRSVPed ? "bg-green-600 hover:bg-green-700" : "bg-purple-600 hover:bg-purple-700"
                }`}
                disabled={isRsvpLoading}
              >
                {isRsvpLoading ? "Processing..." : isRSVPed ? "✓ You're Going!" : "RSVP to Event"}
              </Button>

              {isEventOrganizer && !event.isBoosted && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleBoost(1)}
                    className="border-blue-500 text-blue-600 hover:bg-blue-50"
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    Boost CHF 5
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleBoost(2)}
                    className="border-purple-500 text-purple-600 hover:bg-purple-50"
                  >
                    <Crown className="h-4 w-4 mr-1" />
                    Premium CHF 15
                  </Button>
                </div>
              )}
            </div>

            {isRSVPed && (
              <p className="text-sm text-green-600 mt-2 text-center">
                Great! We'll send you event updates and reminders.
              </p>
            )}

            {isEventOrganizer && (
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <Button variant="outline" onClick={() => setIsEditing((prev) => !prev)}>
                  {isEditing ? "Cancel Edit" : "Edit Event"}
                </Button>
                {isEditing && (
                  <Button onClick={handleEditSave} disabled={editLoading} className="bg-purple-600 hover:bg-purple-700">
                    {editLoading ? "Saving..." : "Save Changes"}
                  </Button>
                )}
                <Button variant="destructive" onClick={handleDelete}>
                  Delete Event
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          eventTitle={event.title}
          boostLevel={boostLevel}
          onPaymentSuccess={() => {
            void (async () => {
              try {
                await boostEvent(event.id)
              } catch (error) {
                console.error("Boost error:", error)
              } finally {
                setShowPaymentModal(false)
              }
            })()
          }}
        />
      )}
    </>
  )
}
