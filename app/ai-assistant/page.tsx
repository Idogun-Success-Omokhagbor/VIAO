"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bot, Send } from "lucide-react"
import { getViaoAIResponseWithHistory } from "@/lib/viao-ai-assistant"
import { Header } from "@/components/header"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Message {
  id: string
  text: string
  sender: "user" | "assistant"
  timestamp: Date
}

export default function AIAssistantPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">AI Assistant</h1>
          <ChatWithViao />
        </div>
      </main>
    </div>
  )
}

// AIAssistantChat component implementation renamed to ChatWithViao
function ChatWithViao() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Welcome to Viao AI Assistant! I'm here to help you discover events, find activities, and answer questions about Swiss cities. What would you like to explore today?",
      sender: "assistant",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/ai/chat", { credentials: "include", cache: "no-store" })
        const data = (await res.json().catch(() => null)) as { messages?: any[]; error?: string } | null
        if (!res.ok) return
        const raw = Array.isArray(data?.messages) ? data!.messages : []
        if (raw.length === 0) return

        setMessages(
          raw
            .filter((m) => m && typeof m.content === "string")
            .map((m) => ({
              id: String(m.id ?? `${Date.now()}`),
              text: String(m.content ?? ""),
              sender: m.role === "user" ? "user" : "assistant",
              timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            })),
        )
      } catch {
      }
    }

    void load()
  }, [])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const history = messages
      .filter((m) => typeof m.text === "string" && m.text.trim().length > 0)
      .slice(-12)
      .map((m) => ({ role: m.sender === "user" ? ("user" as const) : ("assistant" as const), content: m.text }))

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const response = await getViaoAIResponseWithHistory(inputValue, history)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.message,
        sender: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errText = error instanceof Error ? error.message : "AI request failed"
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Sorry — I couldn't respond right now. ${errText}`,
        sender: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const suggestions = [
    "What's happening in Zurich this weekend?",
    "Find yoga classes in Geneva",
    "Best restaurants in Basel",
    "Tech meetups in Bern",
    "Outdoor activities in Interlaken",
    "Art galleries in Lausanne",
  ]

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Chat with Viao
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.sender === "user" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-900"
                }`}
              >
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: (props: any) => <a {...props} className="underline" target="_blank" rel="noreferrer" />,
                    }}
                  >
                    {message.text}
                  </ReactMarkdown>
                </div>
                <p className={`text-xs mt-1 ${message.sender === "user" ? "text-purple-200" : "text-gray-500"}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ask me about events, activities, or locations..."
                disabled={isLoading}
                className="pr-10"
              />
              <Button
                size="sm"
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-1 top-1 h-8 w-8 p-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
