"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, Users, Star, Tag, Lightbulb } from "lucide-react"
import type { Event } from "@/types/event"
import { analyzeEvent, type EventAnalysis } from "@/lib/ai-event-analyzer"

interface AIEventAnalysisProps {
  event: Event
}

export function AIEventAnalysis({ event }: AIEventAnalysisProps) {
  const analysis: EventAnalysis = analyzeEvent(event)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          AI Event Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category & Recommendation Score */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Category</span>
            </div>
            <Badge variant="secondary" className="text-sm">
              {analysis.category}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Recommendation Score</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={analysis.recommendationScore} className="flex-1" />
              <span className="text-sm font-medium">{Math.round(analysis.recommendationScore)}%</span>
            </div>
          </div>
        </div>

        {/* Popularity */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium">Popularity</span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={analysis.popularity} className="flex-1" />
            <span className="text-sm font-medium">{Math.round(analysis.popularity)}%</span>
          </div>
        </div>

        {/* Tags */}
        {analysis.tags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">AI-Generated Tags</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Insights */}
        {analysis.insights.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">AI Insights</span>
            </div>
            <div className="space-y-2">
              {analysis.insights.map((insight, index) => (
                <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similar Events */}
        {analysis.similarEvents.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Similar Events</span>
            <div className="space-y-1">
              {analysis.similarEvents.map((similarEvent, index) => (
                <div key={index} className="text-sm text-gray-600 bg-gray-50 rounded px-2 py-1">
                  {similarEvent}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AIEventAnalysis
