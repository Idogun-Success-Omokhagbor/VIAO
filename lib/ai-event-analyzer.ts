import type { Event } from "@/types/event"

export interface EventAnalysis {
  category: string
  popularity: number
  recommendationScore: number
  tags: string[]
  similarEvents: string[]
  insights: string[]
}

export class AIEventAnalyzer {
  private categories = [
    "Music",
    "Food & Drink",
    "Sports & Fitness",
    "Arts & Culture",
    "Technology",
    "Business & Professional",
    "General",
  ]

  analyzeEvent(event: Event): EventAnalysis {
    // Analyze event category
    const category = this.categorizeEvent(event)

    // Calculate popularity based on attendees
    const popularity = this.calculatePopularity(event)

    // Generate recommendation score
    const recommendationScore = this.generateRecommendationScore(event)

    // Extract and generate tags
    const tags = this.extractTags(event)

    // Find similar events (mock implementation)
    const similarEvents = this.findSimilarEvents(event)

    // Generate insights
    const insights = this.generateInsights(event, popularity, category)

    return {
      category,
      popularity,
      recommendationScore,
      tags,
      similarEvents,
      insights,
    }
  }

  categorizeEvent(event: Event): string {
    const title = event.title.toLowerCase()
    const description = event.description.toLowerCase()

    if (title.includes("music") || title.includes("concert") || title.includes("band")) {
      return "Music"
    }
    if (title.includes("tech") || title.includes("startup") || title.includes("coding")) {
      return "Technology"
    }
    if (title.includes("art") || title.includes("gallery") || title.includes("exhibition")) {
      return "Arts & Culture"
    }
    if (title.includes("food") || title.includes("restaurant") || title.includes("cooking")) {
      return "Food & Drink"
    }
    if (title.includes("sport") || title.includes("fitness") || title.includes("yoga")) {
      return "Sports & Fitness"
    }
    if (title.includes("business") || title.includes("networking") || title.includes("professional")) {
      return "Business & Professional"
    }

    return "General"
  }

  private calculatePopularity(event: Event): number {
    const attendeeCount = event.attendees?.length || 0
    const maxAttendees = 1000 // Assume max for normalization

    // Normalize to 0-100 scale
    return Math.min((attendeeCount / maxAttendees) * 100, 100)
  }

  private generateRecommendationScore(event: Event): number {
    let score = 50 // Base score

    // Boost for recent events
    const daysSinceCreation = Math.floor((Date.now() - event.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceCreation < 7) score += 20

    // Boost for events with good attendance
    const attendeeCount = event.attendees?.length || 0
    if (attendeeCount > 50) score += 15
    if (attendeeCount > 100) score += 10

    // Boost for events with images
    if (event.image) score += 10

    // Boost for boosted events
    if (event.isBoosted) score += 25

    return Math.min(score, 100)
  }

  private extractTags(event: Event): string[] {
    const tags: string[] = []
    const text = `${event.title} ${event.description}`.toLowerCase()

    // Common event-related keywords
    const keywords = [
      "networking",
      "workshop",
      "seminar",
      "conference",
      "meetup",
      "festival",
      "exhibition",
      "performance",
      "competition",
      "training",
      "beginner",
      "advanced",
      "professional",
      "family",
      "kids",
      "outdoor",
      "indoor",
      "virtual",
      "hybrid",
      "free",
      "premium",
    ]

    keywords.forEach((keyword) => {
      if (text.includes(keyword)) {
        tags.push(keyword)
      }
    })

    return tags.slice(0, 5) // Limit to 5 tags
  }

  private findSimilarEvents(event: Event): string[] {
    // Mock implementation - in real app, this would use ML/similarity algorithms
    return ["Similar Event 1", "Similar Event 2", "Similar Event 3"]
  }

  private generateInsights(event: Event, popularity: number, category: string): string[] {
    const insights: string[] = []

    if (popularity > 80) {
      insights.push("This is a highly popular event with strong attendance")
    } else if (popularity < 20) {
      insights.push("This event has room for more attendees")
    }

    if (event.isBoosted) {
      insights.push("This is a promoted event with enhanced visibility")
    }

    if (category === "Technology") {
      insights.push("Tech events typically attract professionals and enthusiasts")
    } else if (category === "Music") {
      insights.push("Music events often have high engagement and social sharing")
    }

    const eventDate = new Date(event.date)
    const isWeekend = eventDate.getDay() === 0 || eventDate.getDay() === 6
    if (isWeekend) {
      insights.push("Weekend events typically have higher attendance rates")
    }

    return insights
  }
}

export const aiEventAnalyzer = new AIEventAnalyzer()

export function analyzeEvent(event: Event): EventAnalysis {
  return aiEventAnalyzer.analyzeEvent(event)
}

export function getEventRecommendations(events: Event[], userPreferences?: string[]): Event[] {
  return events
    .map((event) => ({
      ...event,
      analysis: aiEventAnalyzer.analyzeEvent(event),
    }))
    .sort((a, b) => b.analysis.recommendationScore - a.analysis.recommendationScore)
    .slice(0, 10) // Return top 10 recommendations
}

export function getEventsByCategory(events: Event[], category: string): Event[] {
  return events.filter((event) => {
    const eventCategory = aiEventAnalyzer.categorizeEvent(event)
    return eventCategory.toLowerCase() === category.toLowerCase()
  })
}

export function getPopularEvents(events: Event[], limit = 5): Event[] {
  return events
    .map((event) => ({
      ...event,
      analysis: aiEventAnalyzer.analyzeEvent(event),
    }))
    .sort((a, b) => b.analysis.popularity - a.analysis.popularity)
    .slice(0, limit)
}
