"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Send, X, Minimize2 } from "lucide-react"
import { loadAiHistory, sendAiMessage, type AiUiMessage, type MarkdownAnchorProps } from "@/lib/ai-chat-client"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export interface AIAssistantWidgetProps {
  isOpen?: boolean
  onClose?: () => void
}

function AIAssistantWidget({ isOpen: controlledIsOpen, onClose }: AIAssistantWidgetProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<AiUiMessage[]>([
    {
      id: "1",
      content:
        "Hi! I'm Viao's AI assistant. I can help you find events, discover activities, and guide event organizers. What would you like to know?",
      isUser: false,
      timestamp: new Date(),
      suggestions: [
        "What's happening in Zurich today?",
        "Find yoga classes near me",
        "How do I create an event?",
        "Show me tech meetups",
      ],
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen

  const scrollToLatestMessage = () => {
    const target = messagesEndRef.current
    if (!target) return
    try {
      target.scrollIntoView({ behavior: "smooth", block: "end" })
    } catch {
      try {
        target.scrollIntoView(false)
      } catch {
        // no-op
      }
    }
  }

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

  useEffect(() => {
    scrollToLatestMessage()
  }, [messages])

  const handleSendMessage = async (content: string = inputValue) => {
    if (!content.trim() || isLoading) return

    const userMessage: AiUiMessage = {
      id: Date.now().toString(),
      content: content.trim(),
      isUser: true,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    try {
      const response = await sendAiMessage(content.trim(), messages)

      const aiMessage: AiUiMessage = {
        id: (Date.now() + 1).toString(),
        content: response.message,
        isUser: false,
        timestamp: new Date(),
        suggestions: response.suggestions,
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      toast.error("Failed to get AI response. Please try again.")

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

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion)
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      setInternalIsOpen(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <Card
      className={`fixed bottom-2 right-2 sm:bottom-6 sm:right-6 w-[calc(100vw-1rem)] sm:w-96 max-h-[calc(100dvh-1rem)] shadow-xl z-50 transition-all duration-300 ${
        isMinimized ? "h-14" : "h-[500px]"
      }`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">AI Assistant</CardTitle>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => setIsMinimized(!isMinimized)} className="h-8 w-8">
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="flex flex-col h-[420px] max-h-[calc(100dvh-8rem)]">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="space-y-2">
                  <div className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        message.isUser ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">
                        <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            a: (props: MarkdownAnchorProps) => <a {...props} className="underline" target="_blank" rel="noreferrer" />,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>

                  {message.suggestions && (
                    <div className="flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm">
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
            <div ref={messagesEndRef} />
          </ScrollArea>

          <div className="flex items-center space-x-2 pt-4">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask me about events..."
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              disabled={isLoading}
            />
            <Button onClick={() => handleSendMessage()} disabled={isLoading || !inputValue.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default AIAssistantWidget
export { AIAssistantWidget }
