"use client"

import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { HeroSection } from "@/components/hero-section"
import { FeaturesSection } from "@/components/features-section"
import { WhyChooseSection } from "@/components/why-choose-section"
import { ExploreSection } from "@/components/explore-section"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { AIAssistantWidget } from "@/components/ai-assistant-widget"

export default function HomePage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push("/dashboard")
    }
  }, [user, router])

  if (user) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <WhyChooseSection />
        <ExploreSection />
      </main>
      <Footer />
      <AIAssistantWidget />
    </div>
  )
}
