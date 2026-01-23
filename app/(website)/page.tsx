"use client"

import HeroSection from "@/components/hero-section"
import FeaturesSection from "@/components/features-section"
import WhyChooseSection from "@/components/why-choose-section"
import ExploreSection from "@/components/explore-section"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <WhyChooseSection />
      <ExploreSection />
    </div>
  )
}
