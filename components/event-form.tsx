"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Calendar,
  MapPin,
  Users,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Zap,
  Crown,
} from "lucide-react"
import { useEvents } from "@/context/events-context"
import { useAuth } from "@/context/auth-context"
import PaymentModal from "./payment-modal"
import type { Event } from "@/types/event"

type SiteConfig = {
  stripeEnabled?: boolean
}

interface EventFormProps {
  onClose: () => void
  mode?: "create" | "edit"
  event?: Event
}

interface FormData {
  title: string
  description: string
  category: string
  date: string
  time: string
  location: string
  price: number
  maxAttendees: number | null
  imageUrls: string[]
  boostLevel: number
  shouldBoost: boolean
}

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file

  const MAX_DIM = 1280
  const QUALITY = 0.82

  const bitmap = await createImageBitmap(file)

  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height))
  const targetW = Math.max(1, Math.round(bitmap.width * scale))
  const targetH = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = targetW
  canvas.height = targetH

  const ctx = canvas.getContext("2d")
  if (!ctx) return file

  ctx.drawImage(bitmap, 0, 0, targetW, targetH)

  const outType = file.type === "image/png" ? "image/png" : "image/jpeg"

  const blob: Blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b ?? file), outType, outType === "image/jpeg" ? QUALITY : undefined)
  })

  const ext = outType === "image/png" ? "png" : "jpg"
  const baseName = (file.name || "image").replace(/\.[^/.]+$/, "")
  const outName = `${baseName}.${ext}`
  return new File([blob], outName, { type: outType })
}

const categories = [
  { id: "Technology", label: "Technology", color: "bg-gray-100 text-gray-800 hover:bg-gray-200" },
  { id: "Arts & Culture", label: "Arts & Culture", color: "bg-purple-100 text-purple-800 hover:bg-purple-200" },
  { id: "Sports & Outdoors", label: "Sports & Outdoors", color: "bg-green-100 text-green-800 hover:bg-green-200" },
  { id: "Music", label: "Music", color: "bg-pink-100 text-pink-800 hover:bg-pink-200" },
  { id: "Food & Drink", label: "Food & Drink", color: "bg-orange-100 text-orange-800 hover:bg-orange-200" },
  { id: "Health & Wellness", label: "Health & Wellness", color: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" },
  { id: "Business", label: "Business", color: "bg-blue-100 text-blue-800 hover:bg-blue-200" },
  { id: "Education", label: "Education", color: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200" },
]

const boostOptions = [
  {
    level: 1,
    name: "Basic Boost",
    price: 5,
    duration: "24 hours",
    features: ["Top placement", "Boost badge", "Increased visibility"],
    color: "bg-yellow-400 text-yellow-800",
  },
  {
    level: 2,
    name: "Premium Boost",
    price: 15,
    duration: "72 hours",
    features: ["All Basic features", "Crown badge", "Trending section", "Priority searches", "Social media promotion"],
    color: "bg-gradient-to-r from-yellow-400 to-orange-500 text-white",
  },
]

export function EventForm({ onClose, mode = "create", event }: EventFormProps) {
  const { createEvent, updateEvent } = useEvents()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isOrganizer = user?.role === "ORGANIZER"
  const isEdit = mode === "edit"

  const totalSteps = isEdit ? 3 : 4
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [createdEventId, setCreatedEventId] = useState<string | null>(null)
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null)

  const [formData, setFormData] = useState<FormData>({
    title: event?.title ?? "",
    description: event?.description ?? "",
    category: event?.category ?? "",
    date: event?.date ? event.date.split("T")[0] : "",
    time: event?.time ?? "19:00",
    location: typeof event?.location === "string" ? event.location : "",
    price: event?.price ?? 0,
    maxAttendees: event?.maxAttendees ?? null,
    imageUrls:
      Array.isArray(event?.imageUrls) && event.imageUrls.length > 0
        ? event.imageUrls
        : event?.imageUrl
          ? [event.imageUrl]
          : [],
    boostLevel: 1,
    shouldBoost: false,
  })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch("/api/site-config", { cache: "no-store", credentials: "include" })
        const json = (await res.json().catch(() => null)) as any
        if (!res.ok) throw new Error(json?.error || "Failed to load site configuration")
        if (!cancelled) setSiteConfig((json?.config ?? null) as SiteConfig | null)
      } catch {
        if (!cancelled) setSiteConfig(null)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.title.trim()) newErrors.title = "Event title is required"
      if (formData.title.length > 100) newErrors.title = "Title must be 100 characters or less"
      if (!formData.description.trim()) newErrors.description = "Event description is required"
      if (formData.description.length > 500) newErrors.description = "Description must be 500 characters or less"
      if (!formData.category) newErrors.category = "Please select a category"
    }

    if (step === 2) {
      if (!formData.date) newErrors.date = "Event date is required"
      if (!formData.time) newErrors.time = "Event time is required"
      if (!formData.location.trim()) newErrors.location = "Event location is required"

      // Check if date is in the future
      if (formData.date) {
        const eventDate = new Date(`${formData.date}T${formData.time}`)
        if (eventDate <= new Date()) {
          newErrors.date = "Event must be scheduled for a future date and time"
        }
      }
    }

    if (step === 3) {
      if (formData.price < 0) newErrors.price = "Price cannot be negative"
      if (formData.maxAttendees !== null && formData.maxAttendees < 1) {
        newErrors.maxAttendees = "Max attendees must be at least 1"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
    }
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleInputChange = (field: keyof FormData, value: string | number | boolean | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const handleImagesUpload = async (files: FileList) => {
    if (!files || files.length === 0) return

    const remaining = 5 - formData.imageUrls.length
    if (remaining <= 0) return

    const filesToUpload = Array.from(files).slice(0, remaining)
    setIsUploading(true)

    try {
      for (const file of filesToUpload) {
        if (!file.type.startsWith("image/")) {
          setErrors((prev) => ({ ...prev, image: "Please select image files only" }))
          continue
        }

        if (file.size > 2 * 1024 * 1024) {
          setErrors((prev) => ({ ...prev, image: "Each image must be smaller than 2MB" }))
          continue
        }

        const safeFile = await compressImage(file)

        const fd = new FormData()
        fd.append("file", safeFile)
        const res = await fetch("/api/upload", { method: "POST", body: fd })
        const data = (await res.json()) as { url?: string; error?: string }
        if (!res.ok || !data.url) {
          throw new Error(data.error || "Upload failed")
        }

        setFormData((prev) => ({
          ...prev,
          imageUrls: [...prev.imageUrls, data.url as string].slice(0, 5),
        }))
      }

      setErrors((prev) => ({ ...prev, image: "" }))
    } catch (error) {
      setErrors((prev) => ({ ...prev, image: error instanceof Error ? error.message : "Failed to upload images" }))
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (options?: { draft?: boolean }) => {
    if (!isOrganizer) return
    if (!validateStep(3)) return

    if (!isEdit && options?.draft) {
      setIsSubmitting(true)
      try {
        const dateTime = new Date(`${formData.date}T${formData.time || "00:00"}`)
        await createEvent({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          date: dateTime.toISOString(),
          time: formData.time,
          location: formData.location,
          price: formData.price ?? null,
          maxAttendees: formData.maxAttendees ?? null,
          imageUrls: formData.imageUrls,
          isBoosted: false,
          boostUntil: null,
          status: "DRAFT",
        })
        onClose()
      } catch {
        setErrors((prev) => ({
          ...prev,
          submit: "Failed to save draft. Please try again.",
        }))
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    if (!isEdit && formData.shouldBoost) {
      if (siteConfig?.stripeEnabled === false) {
        setErrors((prev) => ({ ...prev, shouldBoost: "Boosting is currently disabled" }))
        return
      }
      setIsSubmitting(true)
      try {
        const dateTime = new Date(`${formData.date}T${formData.time || "00:00"}`)
        const created = await createEvent({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          date: dateTime.toISOString(),
          time: formData.time,
          location: formData.location,
          price: formData.price ?? null,
          maxAttendees: formData.maxAttendees ?? null,
          imageUrls: formData.imageUrls,
          isBoosted: false,
          boostUntil: null,
          status: "PUBLISHED",
        })
        setCreatedEventId(created.id)
        if (siteConfig?.stripeEnabled !== false) {
          setShowPaymentModal(true)
        }
      } catch {
        setErrors((prev) => ({
          ...prev,
          submit: "Failed to create event. Please try again.",
        }))
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    await saveAndClose()
  }

  const saveAndClose = async () => {
    setIsSubmitting(true)
    try {
      const dateTime = new Date(`${formData.date}T${formData.time || "00:00"}`)

      if (isEdit) {
        if (!event?.id) throw new Error("Missing event")
        await updateEvent(event.id, {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          date: dateTime.toISOString(),
          time: formData.time,
          location: formData.location,
          price: formData.price ?? null,
          maxAttendees: formData.maxAttendees ?? null,
          imageUrls: formData.imageUrls,
        })
      } else {
        await createEvent({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          date: dateTime.toISOString(),
          time: formData.time,
          location: formData.location,
          price: formData.price ?? null,
          maxAttendees: formData.maxAttendees ?? null,
          imageUrls: formData.imageUrls,
          isBoosted: false,
          boostUntil: null,
          status: "PUBLISHED",
        })
      }

      onClose()
    } catch {
      setErrors((prev) => ({ ...prev, submit: isEdit ? "Failed to update event. Please try again." : "Failed to create event. Please try again." }))
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Select date"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return "Select time"
    const [hours, minutes] = timeString.split(":")
    const date = new Date()
    date.setHours(Number.parseInt(hours), Number.parseInt(minutes))
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const selectedBoostOption = boostOptions.find((option) => option.level === formData.boostLevel)

  return (
    <>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{isEdit ? "Edit Event" : "Create New Event"}</h2>
            <p className="text-gray-600">{isEdit ? "Update your event details" : "Share your event with the community"}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-600"
                }`}
              >
                {step < currentStep ? <Check className="w-4 h-4" /> : step}
              </div>
              {step < totalSteps && (
                <div className={`w-16 h-1 mx-2 ${step < currentStep ? "bg-purple-600" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="max-w-2xl mx-auto">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Basic Information</h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Event Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange("title", e.target.value)}
                      placeholder="Enter event title"
                      className={errors.title ? "border-red-500" : ""}
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>{errors.title && <span className="text-red-500">{errors.title}</span>}</span>
                      <span>{formData.title.length}/100</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Event Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Describe your event..."
                      rows={4}
                      className={errors.description ? "border-red-500" : ""}
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>{errors.description && <span className="text-red-500">{errors.description}</span>}</span>
                      <span>{formData.description.length}/500</span>
                    </div>
                  </div>

                  <div>
                    <Label>Category *</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {categories.map((category) => (
                        <Badge
                          key={category.id}
                          variant={formData.category === category.id ? "default" : "outline"}
                          className={`cursor-pointer justify-center py-2 ${
                            formData.category === category.id ? "bg-purple-600 hover:bg-purple-700" : category.color
                          }`}
                          onClick={() => handleInputChange("category", category.id)}
                        >
                          {category.label}
                        </Badge>
                      ))}
                    </div>
                    {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">When & Where</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Event Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange("date", e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className={errors.date ? "border-red-500" : ""}
                    />
                    {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
                  </div>

                  <div>
                    <Label htmlFor="time">Event Time *</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) => handleInputChange("time", e.target.value)}
                      className={errors.time ? "border-red-500" : ""}
                    />
                    {errors.time && <p className="text-red-500 text-sm mt-1">{errors.time}</p>}
                  </div>
                </div>

                <div className="mt-4">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    placeholder="Enter event location"
                    className={errors.location ? "border-red-500" : ""}
                  />
                  {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Details & Image</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <Label htmlFor="price">Ticket Price (CHF)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="1"
                      value={formData.price}
                      onChange={(e) => handleInputChange("price", Number.parseInt(e.target.value || "0", 10) || 0)}
                      placeholder="0.00"
                      className={errors.price ? "border-red-500" : ""}
                    />
                    {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                  </div>

                  <div>
                    <Label htmlFor="maxAttendees">Max Attendees (Optional)</Label>
                    <Input
                      id="maxAttendees"
                      type="number"
                      value={formData.maxAttendees ?? ""}
                      onChange={(e) => handleInputChange("maxAttendees", e.target.value ? Number.parseInt(e.target.value) : null)}
                      placeholder="Leave empty for unlimited"
                      min="1"
                      className={errors.maxAttendees ? "border-red-500" : ""}
                    />
                    {errors.maxAttendees && <p className="text-red-500 text-sm mt-1">{errors.maxAttendees}</p>}
                  </div>
                </div>

                <div className="mb-6">
                  <Label>Event Images (Optional, up to 5)</Label>
                  <div className="mt-2">
                    {formData.imageUrls.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {formData.imageUrls.map((url, idx) => (
                          <div key={url} className="relative">
                            <img src={url} alt={`Event image ${idx + 1}`} className="w-full h-28 object-cover rounded-lg" />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-1 right-1 bg-white/80 hover:bg-white"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  imageUrls: prev.imageUrls.filter((_, i) => i !== idx),
                                }))
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {formData.imageUrls.length < 5 && (
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-purple-400 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">{isUploading ? "Uploading..." : "Click to upload images"}</p>
                        <p className="text-sm text-gray-500 mt-1">PNG, JPG up to 2MB each</p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files
                        if (files) void handleImagesUpload(files)
                      }}
                    />
                    {errors.image && <p className="text-red-500 text-sm mt-1">{errors.image}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isEdit && currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Boost Your Event (Optional)</h3>

                {/* Boost Toggle */}
                <div className="flex items-center space-x-2 mb-6">
                  <Checkbox
                    id="shouldBoost"
                    checked={formData.shouldBoost}
                    onCheckedChange={(checked) => handleInputChange("shouldBoost", checked === true)}
                  />
                  <Label htmlFor="shouldBoost" className="text-sm font-medium">
                    Boost this event for maximum visibility
                  </Label>
                </div>

                {/* Boost Options */}
                {formData.shouldBoost && (
                  <div className="space-y-4 mb-6">
                    <Label>Choose Boost Level</Label>
                    <div className="grid gap-4">
                      {boostOptions.map((option) => (
                        <Card
                          key={option.level}
                          className={`cursor-pointer transition-all ${
                            formData.boostLevel === option.level
                              ? "ring-2 ring-purple-600 border-purple-600"
                              : "hover:border-purple-300"
                          }`}
                          onClick={() => handleInputChange("boostLevel", option.level)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge className={option.color}>
                                  {option.level === 2 ? (
                                    <Crown className="w-3 h-3 mr-1" />
                                  ) : (
                                    <Zap className="w-3 h-3 mr-1" />
                                  )}
                                  {option.name}
                                </Badge>
                                <span className="font-semibold text-lg">${option.price}</span>
                              </div>
                              <span className="text-sm text-gray-600">{option.duration}</span>
                            </div>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {option.features.map((feature, index) => (
                                <li key={index} className="flex items-center">
                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Event Preview */}
                <div>
                  <Label>Event Preview</Label>
                  <Card className="mt-2">
                    <CardHeader className="p-0">
                      <div className="h-32 bg-gradient-to-br from-purple-400 to-blue-500 rounded-t-lg relative">
                        {formData.imageUrls.length > 0 ? (
                          <img
                            src={formData.imageUrls[0] || "/placeholder.svg"}
                            alt="Event preview"
                            className="w-full h-full object-cover rounded-t-lg"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Calendar className="w-8 h-8 text-white opacity-50" />
                          </div>
                        )}

                        {/* Boost Badge Preview */}
                        {formData.shouldBoost && selectedBoostOption && (
                          <div className="absolute top-2 left-2">
                            <Badge className={selectedBoostOption.color}>
                              {formData.boostLevel === 2 ? (
                                <Crown className="w-3 h-3 mr-1" />
                              ) : (
                                <Zap className="w-3 h-3 mr-1" />
                              )}
                              {selectedBoostOption.name}
                            </Badge>
                          </div>
                        )}

                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="bg-white/90 text-gray-800">
                            {categories.find((c) => c.id === formData.category)?.label || "Category"}
                          </Badge>
                        </div>
                        <div className="absolute bottom-2 right-2">
                          <Badge
                            variant={formData.price === 0 ? "default" : "secondary"}
                            className={formData.price === 0 ? "bg-green-600" : "bg-blue-600"}
                          >
                            {formData.price === 0 ? "Free" : `$${formData.price.toFixed(2)}`}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <CardTitle className="text-lg mb-2">{formData.title || "Event Title"}</CardTitle>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>
                            {formatDate(formData.date)} at {formatTime(formData.time)}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span>{formData.location || "Event Location"}</span>
                        </div>
                        {formData.maxAttendees && (
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2" />
                            <span>Max {formData.maxAttendees} attendees</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t">
          <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 1}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="text-sm text-gray-500">Step {currentStep} of {totalSteps}</div>

          {currentStep < totalSteps ? (
            <Button onClick={handleNext} className="bg-purple-600 hover:bg-purple-700">
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              {!isEdit && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => void handleSubmit({ draft: true })}
                >
                  Save Draft
                </Button>
              )}
              <Button
                onClick={() => void handleSubmit()}
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSubmitting ? "Saving..." : isEdit ? "Update Event" : "Create Event"}
              </Button>
            </div>
          )}
        </div>

        {errors.submit && <p className="text-red-500 text-sm text-center mt-4">{errors.submit}</p>}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedBoostOption && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          eventId={createdEventId ?? ""}
          eventTitle={formData.title}
          boostLevel={formData.boostLevel}
        />
      )}
    </>
  )
}

export default EventForm
