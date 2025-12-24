"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Users, Calendar, MessageCircle, Bot, Star, Zap, Shield, Heart } from "lucide-react"

const features = [
  {
    icon: MapPin,
    title: "Discover Local Events",
    description: "Find amazing events happening right in your neighborhood with our location-based discovery.",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    icon: Users,
    title: "Connect with Community",
    description: "Meet like-minded people, join discussions, and build meaningful connections in your area.",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  {
    icon: Calendar,
    title: "Create & Manage Events",
    description: "Easily organize your own events with our intuitive planning tools and promotion features.",
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  {
    icon: MessageCircle,
    title: "Real-time Messaging",
    description: "Chat with event organizers and attendees to coordinate plans and make new friends.",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  {
    icon: Bot,
    title: "AI-Powered Recommendations",
    description: "Get personalized event suggestions based on your interests, location, and past activities.",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
  },
  {
    icon: Star,
    title: "Event Reviews & Ratings",
    description: "Read reviews from other attendees and share your own experiences to help the community.",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
]

const stats = [
  { label: "Active Users", value: "10K+", icon: Users },
  { label: "Events Created", value: "2.5K+", icon: Calendar },
  { label: "Cities Covered", value: "50+", icon: MapPin },
  { label: "Success Rate", value: "98%", icon: Zap },
]

export function FeaturesSection() {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Features
          </Badge>
          <h2 className="text-3xl font-bold mb-4">Everything You Need to Connect</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Powerful features designed to help you discover, create, and enjoy amazing experiences in your community
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 leading-relaxed">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Section */}
        <div className="bg-gray-50 rounded-2xl p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-semibold mb-2">Trusted by Thousands</h3>
            <p className="text-gray-600">Join our growing community of event enthusiasts</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <stat.icon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <div className="flex items-center justify-center gap-8 text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="text-sm">Secure & Private</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5" />
              <span className="text-sm">Community Driven</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span className="text-sm">Always Improving</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection
