"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Sparkles, Users, Zap, Brain, Globe, ArrowRight, Star } from "lucide-react"
import Link from "next/link"

export default function V2Page() {
  const [email, setEmail] = useState("")

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Discovery",
      description: "Smart recommendations based on your preferences and behavior",
    },
    {
      icon: Globe,
      title: "Global Events",
      description: "Discover events worldwide with local insights",
    },
    {
      icon: Zap,
      title: "Real-time Updates",
      description: "Get instant notifications about events you care about",
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "Connect with like-minded people and build lasting relationships",
    },
  ]

  const stats = [
    { label: "Active Users", value: "50K+" },
    { label: "Events Created", value: "10K+" },
    { label: "Cities Covered", value: "100+" },
    { label: "Communities", value: "500+" },
  ]

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Viao V2</span>
            <Badge variant="secondary" className="ml-2">
              Beta
            </Badge>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost">Back to V1</Button>
            </Link>
            <Button>Get Early Access</Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge variant="outline" className="mb-4">
            🚀 Coming Soon
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
            The Future of Event Discovery
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Experience next-generation event discovery powered by advanced AI, immersive experiences, and seamless
            community connections.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <div className="flex w-full sm:w-auto">
              <Input
                type="email"
                placeholder="Enter your email for early access"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-r-none w-full sm:w-80"
              />
              <Button className="rounded-l-none">
                Join Waitlist
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Preview */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">What's New in V2</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We're rebuilding Viao from the ground up with cutting-edge technology and user-centric design principles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Preview Cards */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI Assistant Preview */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                Enhanced AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm bg-white rounded-lg p-3 shadow-sm">
                        "I found 5 jazz concerts this weekend in Zurich. Based on your previous attendance, I recommend
                        the Miles Davis Tribute at Moods - it matches your taste perfectly!"
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-purple-600 text-white rounded-lg p-3 max-w-xs">
                      <p className="text-sm">That sounds perfect! Can you book tickets for me?</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Community Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Smart Communities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full"></div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Jazz Lovers Zurich</p>
                    <p className="text-xs text-gray-600">2.3k members</p>
                  </div>
                  <Button size="sm" variant="outline">
                    Join
                  </Button>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-green-400 rounded-full"></div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Tech Meetup Basel</p>
                    <p className="text-xs text-gray-600">1.8k members</p>
                  </div>
                  <Button size="sm" variant="outline">
                    Join
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <CardContent className="text-center py-16">
            <h2 className="text-3xl font-bold mb-4">Be Among the First</h2>
            <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
              Join our exclusive beta program and help shape the future of event discovery. Limited spots available.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" variant="secondary">
                Request Beta Access
                <Star className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="ghost" className="text-white border-white hover:bg-white/10">
                Learn More
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 text-center text-gray-600">
        <div className="flex items-center justify-center space-x-6 mb-6">
          <Link href="/privacy" className="hover:text-gray-900 transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-gray-900 transition-colors">
            Terms
          </Link>
          <Link href="/contact" className="hover:text-gray-900 transition-colors">
            Contact
          </Link>
        </div>
        <p>&copy; 2024 Viao. All rights reserved.</p>
      </footer>
    </div>
  )
}
