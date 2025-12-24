import type React from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AIAssistantWidget } from "@/components/ai-assistant-widget"

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <AIAssistantWidget />
    </div>
  )
}
