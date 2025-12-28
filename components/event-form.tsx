"use client"

import { useState, useRef } from "react"
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
  CreditCard,
} from "lucide-react"
import { useEvents } from "@/context/events-context"
import { useAuth } from "@/context/auth-context"
import PaymentModal from "./payment-modal"

interface EventFormProps {
  onClose: () => void
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
  imageUrl: string
  boostLevel: number
  shouldBoost: boolean
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
    duration: "48 hours",
    features: ["All Basic features", "Crown badge", "Trending section", "Priority searches", "Social media promotion"],
    color: "bg-gradient-to-r from-yellow-400 to-orange-500 text-white",
  },
]

export function EventForm({ onClose }: EventFormProps) {
  const { createEvent } = useEvents()
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isOrganizer = user?.role === "ORGANIZER"

  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    category: "",
    date: "",
    time: "19:00",
    location: "",
    price: 0,
    maxAttendees: null,
    imageUrl: "",
    boostLevel: 1,
    shouldBoost: false,
  })

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
      setCurrentStep((prev) => Math.min(prev + 1, 4))
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

  const handleImageUpload = async (file: File) => {
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, image: "Please select an image file" }))
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: "Image must be smaller than 5MB" }))
      return
    }

    setIsUploading(true)
    try {
      // Simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Create object URL for preview
      const imageUrl = URL.createObjectURL(file)
      setFormData((prev) => ({ ...prev, imageUrl }))
      setErrors((prev) => ({ ...prev, image: "" }))
    } catch (error) {
      setErrors((prev) => ({ ...prev, image: "Failed to upload image" }))
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async () => {
    if (!isOrganizer) return
    if (!validateStep(3)) return

    if (formData.shouldBoost) {
      setShowPaymentModal(true)
      return
    }

    await createEventAndClose()
  }

  const createEventAndClose = async () => {
    setIsSubmitting(true)
    try {
      const dateTime = new Date(`${formData.date}T${formData.time || "00:00"}`)
      const boostDurationHours = formData.shouldBoost ? (formData.boostLevel === 2 ? 48 : 24) : 0
      const boostUntil = formData.shouldBoost ? new Date(dateTime.getTime() + boostDurationHours * 60 * 60 * 1000) : null

      await createEvent({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        date: dateTime.toISOString(),
        time: formData.time,
        location: formData.location,
        price: formData.price ?? null,
        maxAttendees: formData.maxAttendees ?? null,
        imageUrl: formData.imageUrl || undefined,
        isBoosted: formData.shouldBoost,
        boostUntil: boostUntil ? boostUntil.toISOString() : null,
      })

      onClose()
    } catch (error) {
      setErrors((prev) => ({ ...prev, submit: "Failed to create event. Please try again." }))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false)
    await createEventAndClose()
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
            <h2 className="text-2xl font-bold text-gray-900">Create New Event</h2>
            <p className="text-gray-600">Share your event with the community</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {!isOrganizer && (
          <div className="mb-6 rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            Only organizer accounts can create, edit, boost, or delete events. You can still browse and RSVP as a User.
          </div>
        )}

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-600"
                }`}
              >
                {step < currentStep ? <Check className="w-4 h-4" /> : step}
              </div>
              {step < 4 && <div className={`w-16 h-1 mx-2 ${step < currentStep ? "bg-purple-600" : "bg-gray-200"}`} />}
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
                    <Label htmlFor="price">Ticket Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => handleInputChange("price", Number.parseFloat(e.target.value) || 0)}
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
                  <Label>Event Image (Optional)</Label>
                  <div className="mt-2">
                    {formData.imageUrl ? (
                      <div className="relative">
                        <img
                          src={formData.imageUrl || "/placeholder.svg"}
                          alt="Event preview"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                          onClick={() => setFormData((prev) => ({ ...prev, imageUrl: "" }))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">{isUploading ? "Uploading..." : "Click to upload an image"}</p>
                        <p className="text-sm text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleImageUpload(file)
                      }}
                    />
                    {errors.image && <p className="text-red-500 text-sm mt-1">{errors.image}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Boost Your Event (Optional)</h3>

                {/* Boost Toggle */}
                <div className="flex items-center space-x-2 mb-6">
                  <Checkbox
                    id="shouldBoost"
                    checked={formData.shouldBoost}
                    onCheckedChange={(checked) => handleInputChange("shouldBoost", checked)}
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
                        {formData.imageUrl ? (
                          <img
                            src={formData.imageUrl || "/placeholder.svg"}
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

          <div className="text-sm text-gray-500">Step {currentStep} of 4</div>

          {currentStep < 4 ? (
            <Button onClick={handleNext} className="bg-purple-600 hover:bg-purple-700">
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !isOrganizer}
              className="bg-purple-600 hover:bg-purple-700"
              title={!isOrganizer ? "Only organizers can create events" : undefined}
            >
              {isSubmitting ? (
                "Creating..."
              ) : formData.shouldBoost ? (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay & Create Event
                </>
              ) : (
                "Create Event"
              )}
            </Button>
          )}
        </div>

        {errors.submit && <p className="text-red-500 text-sm text-center mt-4">{errors.submit}</p>}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedBoostOption && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
          eventTitle={formData.title}
          boostLevel={formData.boostLevel}
        />
      )}
    </>
  )
}

export default EventForm
