"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Plus, MoreVertical, MessageCircle } from "lucide-react"
import { useMessaging } from "@/context/messaging-context"
import { useAuth } from "@/context/auth-context"
import type { Conversation } from "@/types/messaging"

interface MessagingSidebarProps {
  onConversationSelect: (conversation: Conversation) => void
  selectedConversationId?: string
}

export function MessagingSidebar({ onConversationSelect, selectedConversationId }: MessagingSidebarProps) {
  const { user } = useAuth()
  const { conversations } = useMessaging()
  const [searchQuery, setSearchQuery] = useState("")

  const filteredConversations = conversations.filter((conversation) => {
    const otherParticipant = conversation.participants.find((p) => p.id !== user?.id)
    return otherParticipant?.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (days === 1) {
      return "Yesterday"
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: "short" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Messages
          </CardTitle>
          <Button size="sm" variant="ghost">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="space-y-1 p-3">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs">Start messaging with community members!</p>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const otherParticipant = conversation.participants.find((p) => p.id !== user?.id)
                if (!otherParticipant) return null

                return (
                  <div
                    key={conversation.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted ${
                      selectedConversationId === conversation.id ? "bg-muted" : ""
                    }`}
                    onClick={() => onConversationSelect(conversation)}
                  >
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={otherParticipant.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{otherParticipant.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {otherParticipant.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm truncate">{otherParticipant.name}</h4>
                        <span className="text-xs text-muted-foreground">
                          {conversation.lastMessage && formatTime(conversation.lastMessage.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground truncate">
                          {conversation.lastMessage?.content || "No messages yet"}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="default" className="text-xs px-1.5 py-0.5 min-w-[20px] h-5">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default MessagingSidebar
