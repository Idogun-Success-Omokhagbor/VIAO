"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, Search, Phone, Video, MoreVertical, Paperclip, Smile, MessageSquare, User } from "lucide-react"
import { useMessaging } from "@/context/messaging-context"
import { useAuth } from "@/context/auth-context"
import { formatTimeAgo } from "@/lib/utils"

export default function MessagesPage() {
  const { conversations, activeConversation, setActiveConversation, sendMessage } = useMessaging()
  const { user, isAuthenticated, showAuthModal } = useAuth()
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeConversation?.messages])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <MessageSquare className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <CardTitle>Sign in to view messages</CardTitle>
            <p className="text-gray-600">Connect with event organizers and community members</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => showAuthModal("login")} className="w-full">
              Log In
            </Button>
            <Button onClick={() => showAuthModal("signup")} variant="outline" className="w-full">
              Sign Up
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeConversation) return

    await sendMessage(activeConversation.id, newMessage.trim())
    setNewMessage("")
  }

  const filteredConversations = conversations.filter((conv) =>
    conv.participants.some((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-8rem)]">
          <div className="flex h-full">
            {/* Sidebar - Conversations List */}
            <div className="w-80 border-r border-gray-200 flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-xl font-semibold text-gray-900">Messages</h1>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Conversations List */}
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {filteredConversations.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">No conversations found</p>
                    </div>
                  ) : (
                    filteredConversations.map((conversation) => {
                      const otherParticipant = conversation.participants.find((p) => p.id !== user?.id)
                      const lastMessage = conversation.messages[conversation.messages.length - 1]

                      return (
                        <div
                          key={conversation.id}
                          onClick={() => setActiveConversation(conversation)}
                          className={`p-3 rounded-lg cursor-pointer transition-colors mb-1 ${
                            activeConversation?.id === conversation.id
                              ? "bg-purple-50 border border-purple-200"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={otherParticipant?.avatar || "/placeholder.svg"} />
                                <AvatarFallback>
                                  <User className="w-4 h-4" />
                                </AvatarFallback>
                              </Avatar>
                              {otherParticipant?.isOnline && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-medium text-gray-900 truncate">{otherParticipant?.name}</h3>
                                <span className="text-xs text-gray-500">
                                  {lastMessage && formatTimeAgo(lastMessage.timestamp)}
                                </span>
                              </div>

                              {lastMessage && (
                                <p className="text-sm text-gray-600 truncate">
                                  {lastMessage.senderId === user?.id ? "You: " : ""}
                                  {lastMessage.content}
                                </p>
                              )}

                              {conversation.unreadCount > 0 && (
                                <Badge className="mt-1 bg-purple-600 hover:bg-purple-700">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
              {activeConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const otherParticipant = activeConversation.participants.find((p) => p.id !== user?.id)
                          return (
                            <>
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={otherParticipant?.avatar || "/placeholder.svg"} />
                                <AvatarFallback>
                                  <User className="w-4 h-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h2 className="font-semibold text-gray-900">{otherParticipant?.name}</h2>
                                <p className="text-sm text-gray-500">
                                  {otherParticipant?.isOnline
                                    ? "Online"
                                    : `Last seen ${formatTimeAgo(otherParticipant?.lastSeen || new Date())}`}
                                </p>
                              </div>
                            </>
                          )
                        })()}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Video className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {activeConversation.messages.map((message) => {
                        const isOwnMessage = message.senderId === user?.id
                        const sender = activeConversation.participants.find((p) => p.id === message.senderId)

                        return (
                          <div key={message.id} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`flex gap-2 max-w-xs lg:max-w-md ${isOwnMessage ? "flex-row-reverse" : ""}`}
                            >
                              {!isOwnMessage && (
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={sender?.avatar || "/placeholder.svg"} />
                                  <AvatarFallback className="text-xs">
                                    <User className="w-3 h-3" />
                                  </AvatarFallback>
                                </Avatar>
                              )}

                              <div
                                className={`rounded-lg px-3 py-2 ${
                                  isOwnMessage ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-900"
                                }`}
                              >
                                <p className="text-sm">{message.content}</p>
                                <p className={`text-xs mt-1 ${isOwnMessage ? "text-purple-200" : "text-gray-500"}`}>
                                  {formatTimeAgo(message.timestamp)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg focus-within:border-purple-500">
                          <Button type="button" variant="ghost" size="sm">
                            <Paperclip className="w-4 h-4" />
                          </Button>
                          <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                          <Button type="button" variant="ghost" size="sm">
                            <Smile className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <Button type="submit" disabled={!newMessage.trim()} className="bg-purple-600 hover:bg-purple-700">
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                /* No Conversation Selected */
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No conversation selected</h3>
                    <p className="text-gray-500">Choose a conversation from the sidebar to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
