"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { MessageCircle, X } from "lucide-react"
import type { AIAssistantWidgetProps } from "./ai-assistant-widget"

const AIAssistantWidget = dynamic<AIAssistantWidgetProps>(() => import("./ai-assistant-widget"), { ssr: false })

export default function FloatingButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-[calc(6.4rem+env(safe-area-inset-bottom))] right-5 h-14 w-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg transition-all duration-200 hover:scale-110 hover:from-purple-700 hover:to-blue-700 md:bottom-24 md:right-6 z-40"
        size="lg"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </Button>

      {isOpen ? <AIAssistantWidget isOpen={isOpen} onClose={() => setIsOpen(false)} /> : null}
    </>
  )
}
