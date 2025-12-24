"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, Users, MapPin, Zap, Shield, Heart, ArrowRight, Star } from "lucide-react"

const benefits = [
  {
    icon: Users,
    title: "Vibrant Community",
    description: "Connect with thousands of like-minded people in your area who share your interests and passions.",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    icon: MapPin,
    title: "Local Focus",
    description: "Discover events and activities happening right in your neighborhood, making it easy to participate.",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    icon: Zap,
    title: "Smart Recommendations",
    description: "Our AI learns your preferences to suggest events you'll love, saving you time and effort.",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    icon: Shield,
    title: "Safe & Secure",
    description: "Your privacy and security are our top priorities. All events are verified and moderated.",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
]

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Event Organizer",
    content:
      "Viao has transformed how I organize community events. The platform makes it so easy to reach the right audience.",
    avatar: "/placeholder.svg?height=40&width=40",
    rating: 5,
  },
  {
    name: "Marcus Weber",
    role: "Community Member",
    content: "I've discovered so many amazing local events through Viao. It's become my go-to app for weekend plans.",
    avatar: "/placeholder.svg?height=40&width=40",
    rating: 5,
  },
  {
    name: "Elena Rodriguez",
    role: "Business Owner",
    content: "The AI recommendations are spot-on! I've found events that perfectly match my interests every time.",
    avatar: "/placeholder.svg?height=40&width=40",
    rating: 5,
  },
]

export function WhyChooseSection() {
  return (
    <section className="py-16 bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Why Choose Viao
          </Badge>
          <h2 className="text-3xl font-bold mb-4">Your Gateway to Amazing Experiences</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Join thousands of people who have already discovered the power of community-driven events
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {benefits.map((benefit, index) => (
            <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
              <CardContent className="p-8">
                <div
                  className={`w-16 h-16 rounded-2xl ${benefit.bgColor} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                >
                  <benefit.icon className={`w-8 h-8 ${benefit.color}`} />
                </div>
                <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
                <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
                <div className="flex items-center mt-4 text-sm text-purple-600 font-medium">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verified & Trusted
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h3 className="text-2xl font-semibold mb-4">What Our Community Says</h3>
            <p className="text-gray-600">Real stories from real people who love using Viao</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 italic">"{testimonial.content}"</p>
                  <div className="flex items-center">
                    <img
                      src={testimonial.avatar || "/placeholder.svg"}
                      alt={testimonial.name}
                      className="w-10 h-10 rounded-full mr-3"
                    />
                    <div>
                      <div className="font-semibold text-sm">{testimonial.name}</div>
                      <div className="text-xs text-gray-500">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white rounded-2xl p-8 shadow-sm">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-center mb-4">
              <Heart className="w-6 h-6 text-red-500 mr-2" />
              <span className="text-sm font-medium text-gray-600">Join 10,000+ happy users</span>
            </div>
            <h3 className="text-2xl font-bold mb-4">Ready to Start Your Journey?</h3>
            <p className="text-gray-600 mb-6">
              Join our community today and discover amazing events happening around you
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="bg-transparent">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default WhyChooseSection
