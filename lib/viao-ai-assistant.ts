import type { Event } from "@/types/event"

interface AIQuery {
  text: string
  location?: string
  activity?: string
  timeframe?: string
  intent: "find_events" | "organizer_help" | "general" | "location_query" | "activity_query"
}

interface AIResponse {
  message: string
  suggestions?: string[]
}

// Mock events data with Swiss cities - this could be connected to your actual events context
const mockEvents: any[] = [
  {
    id: "1",
    title: "Zurich Tech Meetup",
    description: "Join us for an evening of networking and tech talks in the heart of Zurich.",
    category: "technology",
    date: "2024-01-15",
    time: "18:00",
    location: "Zurich, Switzerland",
    price: 0,
    attendees: 45,
    maxAttendees: 100,
    organizer: "Tech Community Zurich",
    userId: "org1",
    imageUrl: "/tech-startup-meetup-networking.png",
    isBoosted: true,
    boostedUntil: "2024-01-16T18:00:00Z",
    boostCount: 2,
    rsvpList: ["user1", "user2"],
    createdAt: "2025-01-15T10:00:00Z",
  },
  {
    id: "2",
    title: "Morning Yoga in Geneva",
    description: "Start your day with a peaceful yoga session by Lake Geneva.",
    category: "health",
    date: "2024-01-16",
    time: "07:00",
    location: "Geneva, Switzerland",
    price: 25,
    attendees: 12,
    maxAttendees: 20,
    organizer: "Geneva Wellness Center",
    userId: "org2",
    imageUrl: "/forest-trail-hikers.png",
    isBoosted: false,
    rsvpList: [],
    createdAt: "2025-01-16T09:00:00Z",
  },
  {
    id: "3",
    title: "Basel Art Gallery Opening",
    description: "Discover contemporary art from local Swiss artists in this exclusive gallery opening.",
    category: "arts",
    date: "2024-01-17",
    time: "19:30",
    location: "Basel, Switzerland",
    price: 15,
    attendees: 28,
    maxAttendees: 50,
    organizer: "Basel Art Collective",
    userId: "org3",
    imageUrl: "/art-gallery-opening.png",
    isBoosted: true,
    boostedUntil: "2024-01-18T19:30:00Z",
    boostCount: 1,
    rsvpList: ["user3"],
    createdAt: "2025-01-17T14:30:00Z",
  },
  {
    id: "4",
    title: "Zurich Food Festival",
    description: "Taste the best of Swiss and international cuisine at this weekend food festival.",
    category: "food",
    date: "2024-01-20",
    time: "11:00",
    location: "Zurich, Switzerland",
    price: 0,
    attendees: 156,
    maxAttendees: 300,
    organizer: "Zurich Culinary Society",
    userId: "org4",
    imageUrl: "/rooftop-sunset-party.png",
    isBoosted: false,
    rsvpList: [],
    createdAt: "2025-01-18T11:15:00Z",
  },
  {
    id: "5",
    title: "Bern Business Networking",
    description: "Connect with entrepreneurs and business leaders in Switzerland's capital.",
    category: "business",
    date: "2024-01-18",
    time: "17:00",
    location: "Bern, Switzerland",
    price: 30,
    attendees: 35,
    maxAttendees: 60,
    organizer: "Bern Chamber of Commerce",
    userId: "org5",
    imageUrl: "/indie-concert-colorful-lights.png",
    isBoosted: false,
    rsvpList: [],
    createdAt: "2025-01-19T11:15:00Z",
  },
]

// Swiss cities for location detection
const swissCities = [
  "zurich",
  "geneva",
  "basel",
  "bern",
  "lausanne",
  "winterthur",
  "lucerne",
  "st. gallen",
  "lugano",
  "biel",
  "thun",
  "köniz",
  "la chaux-de-fonds",
  "schaffhausen",
  "fribourg",
  "vernier",
  "chur",
  "neuchâtel",
  "uster",
  "sion",
]

// Activity keywords
const activityKeywords = {
  yoga: ["yoga", "meditation", "wellness", "mindfulness"],
  tech: ["tech", "technology", "startup", "coding", "programming", "ai", "software"],
  food: ["food", "cooking", "restaurant", "cuisine", "dining", "culinary"],
  art: ["art", "gallery", "painting", "exhibition", "culture", "museum"],
  business: ["business", "networking", "entrepreneur", "professional", "corporate"],
  sports: ["sports", "fitness", "running", "cycling", "hiking", "gym"],
  music: ["music", "concert", "band", "festival", "live music", "dj"],
  social: ["social", "party", "meetup", "community", "friends", "gathering"],
}

// Time keywords
const timeKeywords = {
  today: ["today", "now", "current"],
  tomorrow: ["tomorrow", "next day"],
  weekend: ["weekend", "saturday", "sunday"],
  week: ["this week", "week", "weekly"],
  month: ["this month", "month", "monthly"],
}

// Mock AI responses for different types of queries
const responses = {
  greeting: {
    message:
      "Hello! I'm Viao, your AI assistant for Swiss events. I can help you find events, discover activities, and guide event organizers. What would you like to know?",
    suggestions: [
      "What's happening in Zurich today?",
      "Find yoga classes near me",
      "How do I create an event?",
      "Show me tech meetups",
    ],
  },
  events: {
    message:
      "I can help you find events! Here are some popular categories: Tech meetups, Art exhibitions, Music concerts, Sports activities, and Food festivals. What type of event interests you?",
    suggestions: [
      "Show me tech events",
      "Find art galleries",
      "Music concerts this weekend",
      "Sports activities near me",
    ],
  },
  location: {
    message:
      "I can help you find events in Swiss cities! Popular locations include Zurich, Geneva, Basel, Bern, and Lausanne. Which city are you interested in?",
    suggestions: ["Events in Zurich", "Geneva activities", "Basel cultural events", "Bern outdoor activities"],
  },
  organizer: {
    message:
      "Great! I can help you create and promote events. Here's what you need to know: Choose a compelling title, set the right date and time, pick an accessible location, and write an engaging description. Would you like specific tips?",
    suggestions: [
      "How to write event descriptions",
      "Best times to host events",
      "Pricing strategies",
      "Marketing tips",
    ],
  },
  default: {
    message:
      "I'm here to help with events and activities in Switzerland! You can ask me about finding events, creating events, or discovering activities in Swiss cities.",
    suggestions: [
      "Find events near me",
      "How to create an event",
      "Popular activities in Zurich",
      "Event planning tips",
    ],
  },
}

export class ViaoAIAssistant {
  private parseQuery(text: string): AIQuery {
    const lowerText = text.toLowerCase()

    // Detect location
    let location: string | undefined
    for (const city of swissCities) {
      if (lowerText.includes(city)) {
        location = city.charAt(0).toUpperCase() + city.slice(1)
        break
      }
    }

    // Detect activity
    let activity: string | undefined
    for (const [activityType, keywords] of Object.entries(activityKeywords)) {
      if (keywords.some((keyword) => lowerText.includes(keyword))) {
        activity = activityType
        break
      }
    }

    // Detect timeframe
    let timeframe: string | undefined
    for (const [time, keywords] of Object.entries(timeKeywords)) {
      if (keywords.some((keyword) => lowerText.includes(keyword))) {
        timeframe = time
        break
      }
    }

    // Determine intent
    let intent: AIQuery["intent"] = "general"

    if (location && (lowerText.includes("what") || lowerText.includes("happening"))) {
      intent = "location_query"
    } else if (activity && (lowerText.includes("best") || lowerText.includes("find"))) {
      intent = "activity_query"
    } else if (lowerText.includes("event") || lowerText.includes("find") || lowerText.includes("search")) {
      intent = "find_events"
    } else if (lowerText.includes("organizer") || lowerText.includes("promote") || lowerText.includes("create")) {
      intent = "organizer_help"
    }

    return { text, location, activity, timeframe, intent }
  }

  private filterEvents(query: AIQuery): Event[] {
    let filteredEvents = [...mockEvents] as Event[]

    // Filter by location
    if (query.location) {
      filteredEvents = filteredEvents.filter((event) =>
        event.location.toLowerCase().includes(query.location!.toLowerCase()),
      )
    }

    // Filter by activity/category
    if (query.activity) {
      filteredEvents = filteredEvents.filter(
        (event) =>
          event.category === query.activity ||
          event.title.toLowerCase().includes(query.activity!) ||
          event.description.toLowerCase().includes(query.activity!),
      )
    }

    // Filter by timeframe
    if (query.timeframe) {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      filteredEvents = filteredEvents.filter((event) => {
        const eventDate = new Date(event.date)

        switch (query.timeframe) {
          case "today":
            return eventDate.toDateString() === today.toDateString()
          case "tomorrow":
            const tomorrow = new Date(today)
            tomorrow.setDate(tomorrow.getDate() + 1)
            return eventDate.toDateString() === tomorrow.toDateString()
          case "weekend":
            const dayOfWeek = eventDate.getDay()
            return dayOfWeek === 0 || dayOfWeek === 6 // Sunday or Saturday
          case "week":
            const weekFromNow = new Date(today)
            weekFromNow.setDate(weekFromNow.getDate() + 7)
            return eventDate >= today && eventDate <= weekFromNow
          default:
            return true
        }
      })
    }

    // Sort by boosted events first, then by popularity
    return filteredEvents.sort((a, b) => {
      if (a.isBoosted && !b.isBoosted) return -1
      if (!a.isBoosted && b.isBoosted) return 1
      return b.attendees - a.attendees
    })
  }

  public async processQuery(query: string): Promise<AIResponse> {
    const lowerQuery = query.toLowerCase()

    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Event-related queries
    if (lowerQuery.includes("event") || lowerQuery.includes("happening")) {
      if (lowerQuery.includes("zurich")) {
        return {
          message:
            "Here are some events happening in Zurich today: Tech Startup Meetup at 7 PM, Art Gallery Opening at 6 PM, and Indie Concert at 8 PM. Would you like more details about any of these?",
          suggestions: ["Tell me about the Tech Meetup", "Art Gallery details", "Concert ticket info"],
        }
      }
      if (lowerQuery.includes("geneva")) {
        return {
          message:
            "In Geneva today, there's a Yoga Class at 9 AM, Business Networking at 6 PM, and a Rooftop Party at 8 PM. Which one interests you?",
          suggestions: ["Yoga class info", "Networking event", "Party details"],
        }
      }
      return {
        message:
          "I can help you find events! Which city are you interested in? We have events in Zurich, Geneva, Basel, and Bern.",
        suggestions: ["Events in Zurich", "Events in Geneva", "Events in Basel", "Events in Bern"],
      }
    }

    // Activity-specific queries
    if (lowerQuery.includes("yoga")) {
      return {
        message:
          "I found several yoga classes: Morning Yoga in Geneva (9 AM), Evening Yoga in Zurich (7 PM), and Weekend Yoga Retreat in Basel. All levels welcome!",
        suggestions: ["Book Geneva class", "Zurich evening yoga", "Basel retreat info"],
      }
    }

    if (lowerQuery.includes("tech") || lowerQuery.includes("meetup")) {
      return {
        message:
          "Great tech events coming up! There's a Startup Networking event in Zurich tonight, AI Workshop in Geneva tomorrow, and Blockchain Meetup in Basel this weekend.",
        suggestions: ["Zurich startup event", "AI workshop details", "Blockchain meetup"],
      }
    }

    if (lowerQuery.includes("restaurant") || lowerQuery.includes("food")) {
      return {
        message:
          "For dining, I recommend checking our food events! There's a Wine Tasting in Geneva, Food Festival in Zurich, and Cooking Class in Basel.",
        suggestions: ["Wine tasting info", "Food festival details", "Cooking class booking"],
      }
    }

    // Event creation help
    if (lowerQuery.includes("create") || lowerQuery.includes("organize") || lowerQuery.includes("promote")) {
      return {
        message:
          "Creating an event is easy! Click 'Create Event' in the dashboard, fill in details like title, date, location, and description. You can also boost your event for better visibility. Need help with promotion strategies?",
        suggestions: ["Event creation tips", "Promotion strategies", "Boost my event"],
      }
    }

    // Location-based queries
    if (lowerQuery.includes("near me") || lowerQuery.includes("nearby")) {
      return {
        message:
          "I can help you find nearby events! Please enable location access or tell me which city you're in. I'll show you events within your preferred radius.",
        suggestions: ["Enable location", "Events in my city", "Set search radius"],
      }
    }

    // General help
    if (lowerQuery.includes("help") || lowerQuery.includes("how")) {
      return {
        message:
          "I'm here to help! I can assist with finding events, creating events, discovering activities, and navigating the platform. What would you like to know?",
        suggestions: ["Find events", "Create an event", "Platform features", "Account help"],
      }
    }

    // Default response
    return {
      message:
        "I'm Viao's AI assistant! I can help you discover events, find activities, and guide you through event creation. What are you looking for today?",
      suggestions: ["Show me events", "Help me create an event", "Find activities near me", "Platform features"],
    }
  }
}

export async function getViaoAIResponse(query: string): Promise<AIResponse> {
  return getViaoAIResponseWithHistory(query)
}

export async function getViaoAIResponseWithHistory(
  query: string,
  history?: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<AIResponse> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message: query, history: Array.isArray(history) ? history : [] }),
  })

  const data = (await res.json().catch(() => null)) as { message?: string; suggestions?: string[]; error?: string } | null

  if (!res.ok) {
    throw new Error(data?.error || "AI request failed")
  }

  return {
    message: data?.message || "",
    suggestions: Array.isArray(data?.suggestions) ? data?.suggestions : undefined,
  }
}

// Legacy export for backward compatibility (returns plain message string)
export async function viaoAI(query: string): Promise<string> {
  const res = await getViaoAIResponse(query)
  return res.message
}
