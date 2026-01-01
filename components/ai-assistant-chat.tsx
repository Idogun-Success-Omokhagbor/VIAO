"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send } from "lucide-react"
import { getViaoAIResponseWithHistory } from "@/lib/viao-ai-assistant"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

export function AIAssistantChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hi! I'm Viao AI, your personal event assistant. I can help you find events, get recommendations, and answer questions about local activities. What would you like to know?",
      isUser: false,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

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
              content: String(m.content ?? ""),
              isUser: m.role === "user",
              timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            })),
        )
      } catch {
      }
    }

    void load()
  }, [])

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const history = messages
      .filter((m) => typeof m.content === "string" && m.content.trim().length > 0)
      .slice(-12)
      .map((m) => ({ role: m.isUser ? ("user" as const) : ("assistant" as const), content: m.content }))

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      isUser: true,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await getViaoAIResponseWithHistory(input, history)

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.message,
        isUser: false,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error("AI response error:", error)
      const errText = error instanceof Error ? error.message : "AI request failed"
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Sorry — I couldn't respond right now. ${errText}`,
        isUser: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Avatar>
            <AvatarFallback>AI</AvatarFallback>
          </Avatar>
          <span>Viao AI Assistant</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.isUser ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: (props: any) => <a {...props} className="underline" target="_blank" rel="noreferrer" />,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me about events, activities, or recommendations..."
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
