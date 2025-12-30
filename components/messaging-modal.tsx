"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Send, Check, CheckCheck } from "lucide-react"
import { EmojiPicker } from "@/components/emoji-picker"
import { useMessaging } from "@/context/messaging-context"
import { useAuth } from "@/context/auth-context"
import { getAvatarSrc, formatTimeAgo } from "@/lib/utils"
import type { Message, Conversation } from "@/types/messaging"
import { useRouter } from "next/navigation"

interface MessagingModalProps {
  isOpen: boolean
  onClose: () => void
  conversation?: Conversation
}

export function MessagingModal({ isOpen, onClose, conversation }: MessagingModalProps) {
  const { user } = useAuth()
  const { sendMessage, messages, acceptConversation, declineConversation } = useMessaging()
  const router = useRouter()
  const goToUser = (targetUserId: string) => {
    router.push(user?.id === targetUserId ? "/account" : `/profile/${targetUserId}`)
  }
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const conversationMessages = messages
    .filter((msg) => conversation && msg.conversationId === conversation.id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [conversationMessages])

  useEffect(() => {
    if (!isOpen) return
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(newMessage.length, newMessage.length)
    })
  }, [isOpen, conversation, newMessage.length])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversation || !user) return
    await sendMessage(conversation.id, newMessage.trim())
    setNewMessage("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current
    if (!el) {
      setNewMessage((prev) => prev + emoji)
      return
    }

    const start = el.selectionStart ?? newMessage.length
    const end = el.selectionEnd ?? newMessage.length
    const next = newMessage.slice(0, start) + emoji + newMessage.slice(end)
    setNewMessage(next)

    requestAnimationFrame(() => {
      el.focus()
      const cursor = start + emoji.length
      el.setSelectionRange(cursor, cursor)
    })
  }

  const otherParticipant = conversation?.participants.find((p) => p.id !== user?.id)
  const isPending = conversation?.status === "PENDING"
  const isDeclined = conversation?.status === "DECLINED"
  const canSend = conversation?.status === "ACCEPTED"
  const isOnline =
    otherParticipant?.isOnline ??
    (!!otherParticipant?.lastSeen && new Date().getTime() - new Date(otherParticipant.lastSeen).getTime() < 5 * 60 * 1000)

  const renderStatus = (isOwn: boolean, deliveredAt: string | null, readAt: string | null) => {
    if (!isOwn) return null
    if (readAt) {
      return <CheckCheck className="h-4 w-4 text-blue-600" />
    }
    if (deliveredAt) return <CheckCheck className="h-4 w-4 text-gray-400" />
    return <Check className="h-4 w-4 text-gray-400" />
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[600px] p-0">
        {conversation && otherParticipant && (
          <>
            {/* Header */}
            <DialogHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-3"
                    onClick={() => {
                      onClose()
                      goToUser(otherParticipant.id)
                    }}
                  >
                    <Avatar className="cursor-pointer">
                      <AvatarImage src={getAvatarSrc(otherParticipant.name, otherParticipant.avatar)} />
                      <AvatarFallback>{otherParticipant.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-base hover:text-purple-600 transition-colors">{otherParticipant.name}</DialogTitle>
                    </div>
                  </button>
                  <div className="hidden">
                    <div className="flex items-center gap-2 text-xs">
                      {isOnline ? (
                        <span className="text-green-600">Online</span>
                      ) : (
                        <span className="text-yellow-700">
                          Offline · Last seen {otherParticipant.lastSeen ? formatTimeAgo(otherParticipant.lastSeen) : "recently"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1"></div>
              </div>
              {isPending && (
                <div className="mt-2 text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-md p-2">
                  {conversation.requestedBy === user?.id
                    ? "Request sent. Waiting for acceptance."
                    : "This user wants to chat. Accept to start messaging."}
                </div>
              )}
              {isDeclined && (
                <div className="mt-2 text-xs text-red-800 bg-red-50 border border-red-200 rounded-md p-2">
                  This conversation was declined.
                </div>
              )}
            </DialogHeader>

            {/* Messages */}
            <ScrollArea className="flex-1 px-6 py-2 hide-scrollbar" ref={scrollAreaRef}>
              <div className="min-h-full flex flex-col justify-end space-y-4 pb-6">
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
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          {renderStatus(message.senderId === user?.id, message.deliveredAt ?? null, message.readAt ?? null)}
                        </span>
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
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      isDeclined
                        ? "Conversation declined"
                        : isPending
                        ? "Wait for acceptance before sending"
                        : "Type a message..."
                    }
                    className="pr-12"
                    disabled={!canSend}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <EmojiPicker disabled={!canSend} onSelect={insertEmoji} />
                  </div>
                </div>
                <Button onClick={handleSendMessage} disabled={!newMessage.trim() || !canSend} size="sm">
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {isPending && conversation.requestedBy !== user?.id && (
                <div className="flex gap-2 mt-3">
                  <Button variant="default" size="sm" onClick={() => acceptConversation(conversation.id)}>
                    Accept
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => declineConversation(conversation.id)}>
                    Decline
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default MessagingModal
