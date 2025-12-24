"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Send, Phone, Video, MoreVertical, Smile, Paperclip, Mic } from "lucide-react"
import { useMessaging } from "@/context/messaging-context"
import { useAuth } from "@/context/auth-context"
import type { Message, Conversation } from "@/types/messaging"

interface MessagingModalProps {
  isOpen: boolean
  onClose: () => void
  conversation?: Conversation
}

export function MessagingModal({ isOpen, onClose, conversation }: MessagingModalProps) {
  const { user } = useAuth()
  const { sendMessage, messages } = useMessaging()
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const conversationMessages = messages.filter(
    (msg) =>
      conversation &&
      ((msg.senderId === user?.id && msg.receiverId === conversation.participants[0]?.id) ||
        (msg.senderId === conversation.participants[0]?.id && msg.receiverId === user?.id)),
  )

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [conversationMessages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversation || !user) return

    const message: Omit<Message, "id"> = {
      senderId: user.id,
      receiverId: conversation.participants[0].id,
      content: newMessage.trim(),
      type: "text",
      timestamp: new Date(),
      isRead: false,
      isDelivered: true,
    }

    await sendMessage(message)
    setNewMessage("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const otherParticipant = conversation?.participants.find((p) => p.id !== user?.id)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[600px] p-0">
        {conversation && otherParticipant && (
          <>
            {/* Header */}
            <DialogHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={otherParticipant.avatar || "/placeholder.svg"} />
                    <AvatarFallback>{otherParticipant.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-base">{otherParticipant.name}</DialogTitle>
                    <div className="flex items-center gap-2">
                      {otherParticipant.isOnline ? (
                        <Badge variant="secondary" className="text-xs">
                          Online
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Last seen {otherParticipant.lastSeen?.toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {conversationMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === user?.id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.senderId === user?.id ? "bg-purple-600 text-white" : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs opacity-70">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {message.senderId === user?.id && (
                          <span className="text-xs opacity-70">
                            {message.isRead ? "Read" : message.isDelivered ? "Delivered" : "Sent"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-muted p-3 rounded-lg">
                      <div className="flex items-center gap-1">
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

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="pr-16"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <Smile className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <Mic className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()} size="sm">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default MessagingModal
