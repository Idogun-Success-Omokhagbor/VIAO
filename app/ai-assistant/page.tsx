"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bot, Send } from "lucide-react"
import { loadAiHistory, sendAiMessage, type AiUiMessage, type MarkdownAnchorProps } from "@/lib/ai-chat-client"
import { Header } from "@/components/header"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export default function AIAssistantPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Ask Viao AI</h1>
          <ChatWithViao />
        </div>
      </main>
    </div>
  )
}

function ChatWithViao() {
  const [messages, setMessages] = useState<AiUiMessage[]>([
    {
      id: "welcome",
      content:
        "Ask about events, places, or what to do nearby.",
      isUser: false,
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const history = await loadAiHistory()
        if (history && history.length > 0) setMessages(history)
      } catch {
      }
    }

    void load()
  }, [])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: AiUiMessage = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const response = await sendAiMessage(inputValue, messages)
      const assistantMessage: AiUiMessage = {
        id: (Date.now() + 1).toString(),
        content: response.message,
        isUser: false,
        timestamp: new Date(),
        suggestions: response.suggestions,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errText = error instanceof Error ? error.message : "AI request failed"
      const errorMessage: AiUiMessage = {
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
            <div key={message.id} className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.isUser ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-900"
                }`}
              >
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: (props: MarkdownAnchorProps) => <a {...props} className="underline" target="_blank" rel="noreferrer" />,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
                <p className={`text-xs mt-1 ${message.isUser ? "text-purple-200" : "text-gray-500"}`}>
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
                placeholder="Ask about events or places..."
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
