"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { Message, Conversation, User, CreateMessageData } from "@/types/messaging"

interface MessagingContextType {
  conversations: Conversation[]
  messages: Record<string, Message[]>
  isLoading: boolean
  error: string | null
  sendMessage: (data: CreateMessageData) => Promise<void>
  markAsRead: (conversationId: string) => Promise<void>
  createConversation: (userId: string) => Promise<string>
  deleteConversation: (conversationId: string) => Promise<void>
  getUnreadCount: () => number
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined)

export function useMessaging() {
  const context = useContext(MessagingContext)
  if (!context) {
    throw new Error("useMessaging must be used within a MessagingProvider")
  }
  return context
}

interface MessagingProviderProps {
  children: ReactNode
}

export function MessagingProvider({ children }: MessagingProviderProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mock data
  const mockUsers: User[] = [
    {
      id: "user1",
      name: "Sarah Chen",
      avatar: "/placeholder.svg?height=40&width=40",
      isOnline: true,
    },
    {
      id: "user2",
      name: "Marcus Weber",
      avatar: "/placeholder.svg?height=40&width=40",
      isOnline: false,
      lastSeen: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      id: "user3",
      name: "Emma Rodriguez",
      avatar: "/placeholder.svg?height=40&width=40",
      isOnline: true,
    },
  ]

  const mockConversations: Conversation[] = [
    {
      id: "conv1",
      participants: [mockUsers[0]],
      lastMessage: {
        id: "msg1",
        senderId: "user1",
        receiverId: "current",
        content: "Hey! Are you going to the tech meetup tomorrow?",
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        read: false,
        type: "text",
      },
      unreadCount: 2,
      updatedAt: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      id: "conv2",
      participants: [mockUsers[1]],
      lastMessage: {
        id: "msg2",
        senderId: "current",
        receiverId: "user2",
        content: "Thanks for organizing the hiking event!",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        read: true,
        type: "text",
      },
      unreadCount: 0,
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
  ]

  const mockMessages: Record<string, Message[]> = {
    conv1: [
      {
        id: "msg1",
        senderId: "user1",
        receiverId: "current",
        content: "Hey! Are you going to the tech meetup tomorrow?",
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        read: true,
        type: "text",
      },
      {
        id: "msg2",
        senderId: "current",
        receiverId: "user1",
        content: "Yes, I'll be there! Looking forward to it.",
        timestamp: new Date(Date.now() - 1000 * 60 * 25),
        read: true,
        type: "text",
      },
      {
        id: "msg3",
        senderId: "user1",
        receiverId: "current",
        content: "Great! Should we grab coffee before the event?",
        timestamp: new Date(Date.now() - 1000 * 60 * 20),
        read: false,
        type: "text",
      },
    ],
    conv2: [
      {
        id: "msg4",
        senderId: "user2",
        receiverId: "current",
        content: "How was the hiking event?",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
        read: true,
        type: "text",
      },
      {
        id: "msg5",
        senderId: "current",
        receiverId: "user2",
        content: "Thanks for organizing the hiking event!",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        read: true,
        type: "text",
      },
    ],
  }

  // Initialize with mock data
  useState(() => {
    setConversations(mockConversations)
    setMessages(mockMessages)
  })

  const sendMessage = async (data: CreateMessageData) => {
    setIsLoading(true)
    setError(null)

    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      const newMessage: Message = {
        id: Date.now().toString(),
        senderId: "current",
        receiverId: data.receiverId,
        content: data.content,
        timestamp: new Date(),
        read: false,
        type: data.type || "text",
        attachmentUrl: data.attachmentUrl,
      }

      // Find or create conversation
      let conversationId = conversations.find((conv) => conv.participants.some((p) => p.id === data.receiverId))?.id

      if (!conversationId) {
        conversationId = await createConversation(data.receiverId)
      }

      // Add message to conversation
      setMessages((prev) => ({
        ...prev,
        [conversationId!]: [...(prev[conversationId!] || []), newMessage],
      }))

      // Update conversation last message
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, lastMessage: newMessage, updatedAt: new Date() } : conv,
        ),
      )
    } catch (err) {
      setError("Failed to send message")
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (conversationId: string) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 200))

      setConversations((prev) => prev.map((conv) => (conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv)))

      setMessages((prev) => ({
        ...prev,
        [conversationId]: prev[conversationId]?.map((msg) => ({ ...msg, read: true })) || [],
      }))
    } catch (err) {
      setError("Failed to mark as read")
    }
  }

  const createConversation = async (userId: string): Promise<string> => {
    setIsLoading(true)
    setError(null)

    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      const user = mockUsers.find((u) => u.id === userId)
      if (!user) throw new Error("User not found")

      const newConversation: Conversation = {
        id: `conv_${Date.now()}`,
        participants: [user],
        unreadCount: 0,
        updatedAt: new Date(),
      }

      setConversations((prev) => [newConversation, ...prev])
      setMessages((prev) => ({ ...prev, [newConversation.id]: [] }))

      return newConversation.id
    } catch (err) {
      setError("Failed to create conversation")
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const deleteConversation = async (conversationId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      setConversations((prev) => prev.filter((conv) => conv.id !== conversationId))
      setMessages((prev) => {
        const { [conversationId]: deleted, ...rest } = prev
        return rest
      })
    } catch (err) {
      setError("Failed to delete conversation")
    } finally {
      setIsLoading(false)
    }
  }

  const getUnreadCount = () => {
    return conversations.reduce((total, conv) => total + conv.unreadCount, 0)
  }

  const value: MessagingContextType = {
    conversations,
    messages,
    isLoading,
    error,
    sendMessage,
    markAsRead,
    createConversation,
    deleteConversation,
    getUnreadCount,
  }

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>
}
