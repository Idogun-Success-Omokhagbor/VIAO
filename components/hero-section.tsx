"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Search, MapPin, Calendar, Users, ArrowRight, Play, Star, Zap } from "lucide-react"
import { AuthModal } from "./auth-modal"

const quickStats = [
  { label: "Active Events", value: "2,500+", icon: Calendar },
  { label: "Community Members", value: "10,000+", icon: Users },
  { label: "Cities", value: "50+", icon: MapPin },
]

const featuredCategories = [
  "Music & Concerts",
  "Food & Drink",
  "Sports & Fitness",
  "Arts & Culture",
  "Technology",
  "Business",
]

export function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const handleSearch = () => {
    // In a real app, this would navigate to search results
    console.log("Searching for:", searchQuery)
  }

  return (
    <section className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-blue-800 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="absolute inset-0 bg-[url('/placeholder.svg?height=800&width=1200')] bg-cover bg-center opacity-10"></div>

      <div className="relative container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <Badge variant="secondary" className="mb-6 bg-white/10 text-white border-white/20">
            <Zap className="w-4 h-4 mr-2" />
            Discover Amazing Events Near You
          </Badge>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Your City,{" "}
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
              Your Way
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-purple-100 mb-8 max-w-2xl mx-auto leading-relaxed">
            Connect with your community, discover unique experiences, and create unforgettable memories with AI-powered
            event recommendations.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      placeholder="Search events, activities, or places..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/90 border-0 text-gray-900 placeholder:text-gray-500"
                      onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                  <Button onClick={handleSearch} className="bg-purple-600 hover:bg-purple-700 text-white px-8">
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Categories */}
          <div className="mb-12">
            <p className="text-purple-200 mb-4">Popular categories:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {featuredCategories.map((category) => (
                <Button
                  key={category}
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              className="bg-white text-purple-700 hover:bg-gray-100 font-semibold px-8"
              onClick={() => setIsAuthModalOpen(true)}
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white/30 text-white hover:bg-white/10 hover:text-white px-8 bg-transparent"
            >
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
            {quickStats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <div className="text-purple-200 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Social Proof */}
          <div className="mt-12 flex items-center justify-center gap-2 text-purple-200">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
              ))}
            </div>
            <span className="text-sm">Rated 4.9/5 by 1,000+ users</span>
          </div>
        </div>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </section>
  )
}

export default HeroSection
