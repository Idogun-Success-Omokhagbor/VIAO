import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function getInitials(name?: string): string {
  if (!name) return "U"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)
}

export function getRelativeTime(date: string | Date): string {
  const now = new Date()
  const time = new Date(date)
  const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) return "Just now"
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
  return `${Math.floor(diffInMinutes / 1440)}d ago`
}

export function formatTimeAgo(timestamp: string | Date): string {
  const now = new Date()
  const time = new Date(timestamp)

  if (isNaN(time.getTime())) {
    return "Unknown time"
  }

  const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) return "Just now"
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
  return `${Math.floor(diffInMinutes / 1440)}d ago`
}

export function getLocationString(location: any): string {
  if (!location) {
    return "Location TBD"
  }

  if (typeof location === "string") {
    return location
  }

  if (typeof location === "object") {
    // Handle different location object structures
    if (location.address) {
      return location.address
    }

    if (location.name) {
      return location.name
    }

    if (location.city && location.country) {
      return `${location.city}, ${location.country}`
    }

    if (location.coordinates && location.coordinates.lat && location.coordinates.lng) {
      return `${location.coordinates.lat.toFixed(4)}, ${location.coordinates.lng.toFixed(4)}`
    }

    // Fallback - don't use JSON.stringify as it can cause rendering issues
    return "Location available"
  }

  return String(location) || "Location TBD"
}

export function formatPrice(price: number | string): string {
  const numPrice = typeof price === "string" ? Number.parseFloat(price) : price

  if (isNaN(numPrice) || numPrice === 0) {
    return "Free"
  }

  return `CHF ${numPrice}`
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date

  if (isNaN(dateObj.getTime())) {
    return "Date TBD"
  }

  return dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatTime(time: string): string {
  if (!time) {
    return "Time TBD"
  }

  // Handle different time formats
  if (time.includes(":")) {
    const [hours, minutes] = time.split(":")
    const hour = Number.parseInt(hours)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  return time
}

export function timeAgo(date: string | Date): string {
  return formatTimeAgo(date)
}

export function truncateText(text: string, maxLength = 100): string {
  if (!text || text.length <= maxLength) {
    return text || ""
  }

  return text.substring(0, maxLength).trim() + "..."
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateEmail(email: string): boolean {
  return isValidEmail(email)
}

export function capitalizeFirst(str: string): string {
  if (!str) return ""
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date

  if (isNaN(dateObj.getTime())) {
    return "Invalid date"
  }

  return dateObj.toLocaleString()
}

export function getRandomColor(): string {
  const colors = [
    "bg-red-100 text-red-800",
    "bg-blue-100 text-blue-800",
    "bg-green-100 text-green-800",
    "bg-yellow-100 text-yellow-800",
    "bg-purple-100 text-purple-800",
    "bg-pink-100 text-pink-800",
    "bg-indigo-100 text-indigo-800",
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}
