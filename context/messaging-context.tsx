"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Message, Conversation, User } from "@/types/messaging"
import { useAuth } from "@/context/auth-context"

interface MessagingContextType {
  conversations: Conversation[]
  activeConversation: Conversation | null
  messages: Message[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  setActiveConversation: (conversation: Conversation | null) => void
  sendMessage: {
    (conversationId: string, content: string): Promise<void>
    (message: Omit<Message, "id">): Promise<void>
  }
  markAsRead: (conversationId: string) => Promise<void>
  createConversation: (userId: string) => Promise<Conversation>
  getOrCreateConversation: (userId: string) => Promise<Conversation>
  deleteConversation: (conversationId: string) => Promise<void>
  searchMessages: (query: string) => Promise<Message[]>
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
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
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

  useEffect(() => {
    const currentUserId = user?.id ?? "current"
    const initialMessages: Message[] = [
      {
        id: "msg1",
        senderId: "user1",
        receiverId: currentUserId,
        content: "Hey! Are you going to the tech meetup tomorrow?",
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        isRead: true,
        isDelivered: true,
        type: "text",
      },
      {
        id: "msg2",
        senderId: currentUserId,
        receiverId: "user1",
        content: "Yes, I'll be there! Looking forward to it.",
        timestamp: new Date(Date.now() - 1000 * 60 * 25),
        isRead: true,
        isDelivered: true,
        type: "text",
      },
      {
        id: "msg3",
        senderId: "user1",
        receiverId: currentUserId,
        content: "Great! Should we grab coffee before the event?",
        timestamp: new Date(Date.now() - 1000 * 60 * 20),
        isRead: false,
        isDelivered: true,
        type: "text",
      },
      {
        id: "msg4",
        senderId: "user2",
        receiverId: currentUserId,
        content: "How was the hiking event?",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
        isRead: true,
        isDelivered: true,
        type: "text",
      },
      {
        id: "msg5",
        senderId: currentUserId,
        receiverId: "user2",
        content: "Thanks for organizing the hiking event!",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        isRead: true,
        isDelivered: true,
        type: "text",
      },
    ]

    const conv1Messages = initialMessages
      .filter(
        (m) =>
          (m.senderId === "user1" && m.receiverId === currentUserId) || (m.senderId === currentUserId && m.receiverId === "user1"),
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    const conv2Messages = initialMessages
      .filter(
        (m) =>
          (m.senderId === "user2" && m.receiverId === currentUserId) || (m.senderId === currentUserId && m.receiverId === "user2"),
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    const mockConversations: Conversation[] = [
      {
        id: "conv1",
        participants: [mockUsers[0]],
        messages: conv1Messages,
        lastMessage: conv1Messages[conv1Messages.length - 1],
        unreadCount: 2,
        updatedAt: new Date(Date.now() - 1000 * 60 * 30),
      },
      {
        id: "conv2",
        participants: [mockUsers[1]],
        messages: conv2Messages,
        lastMessage: conv2Messages[conv2Messages.length - 1],
        unreadCount: 0,
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
      },
    ]

    setMessages(initialMessages)
    setConversations(mockConversations)
    setActiveConversation(mockConversations[0] ?? null)
  }, [user?.id])

  const sendMessage: MessagingContextType["sendMessage"] = async (arg1: string | Omit<Message, "id">, arg2?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await new Promise((resolve) => setTimeout(resolve, 250))

      const isByConversationId = typeof arg1 === "string"

      const conversationId = isByConversationId ? arg1 : null
      const content = isByConversationId ? (arg2 ?? "") : arg1.content
      if (!content.trim()) return

      const currentUserId = user?.id ?? "current"

      const newMessage: Message = {
        id: Date.now().toString(),
        senderId: currentUserId,
        receiverId: isByConversationId ? "" : arg1.receiverId,
        content: content.trim(),
        timestamp: new Date(),
        isRead: false,
        isDelivered: true,
        type: "text",
      }

      let targetConversationId: string | null = conversationId

      if (!targetConversationId) {
        const receiverId = (arg1 as Omit<Message, "id">).receiverId
        const existing = conversations.find((c) => c.participants.some((p) => p.id === receiverId))
        if (existing) {
          targetConversationId = existing.id
        } else {
          const created = await createConversation(receiverId)
          targetConversationId = created.id
        }
        newMessage.receiverId = receiverId
      } else {
        const conv = conversations.find((c) => c.id === targetConversationId)
        const otherParticipantId = conv?.participants[0]?.id
        if (otherParticipantId) newMessage.receiverId = otherParticipantId
      }

      setMessages((prev) => [...prev, newMessage])

      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== targetConversationId) return conv
          const updatedMessages = [...conv.messages, newMessage]
          return {
            ...conv,
            messages: updatedMessages,
            lastMessage: newMessage,
            updatedAt: new Date(),
          }
        }),
      )

      setActiveConversation((prev) => {
        if (!prev || prev.id !== targetConversationId) return prev
        return {
          ...prev,
          messages: [...prev.messages, newMessage],
          lastMessage: newMessage,
          updatedAt: new Date(),
        }
      })
    } catch {
      setError("Failed to send message")
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (conversationId: string) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 200))

      setConversations((prev) => prev.map((conv) => (conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv)))

      const currentUserId = user?.id ?? "current"
      const otherParticipantId = conversations.find((c) => c.id === conversationId)?.participants?.[0]?.id

      setMessages((prev) =>
        prev.map((msg) => {
          const isInConversation =
            !!otherParticipantId &&
            ((msg.senderId === otherParticipantId && msg.receiverId === currentUserId) ||
              (msg.senderId === currentUserId && msg.receiverId === otherParticipantId))
          return isInConversation ? { ...msg, isRead: true } : msg
        }),
      )

      setActiveConversation((prev) => {
        if (!prev || prev.id !== conversationId) return prev
        return {
          ...prev,
          messages: prev.messages.map((m) => ({ ...m, isRead: true })),
          unreadCount: 0,
        }
      })
    } catch (err) {
      setError("Failed to mark as read")
    }
  }

  const createConversation = async (userId: string): Promise<Conversation> => {
    setIsLoading(true)
    setError(null)

    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      const user = mockUsers.find((u) => u.id === userId)
      if (!user) throw new Error("User not found")

      const newConversation: Conversation = {
        id: `conv_${Date.now()}`,
        participants: [user],
        messages: [],
        unreadCount: 0,
        updatedAt: new Date(),
      }

      setConversations((prev) => [newConversation, ...prev])

      return newConversation
    } catch (err) {
      setError("Failed to create conversation")
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const getOrCreateConversation = async (userId: string): Promise<Conversation> => {
    const existing = conversations.find((conv) => conv.participants.some((p) => p.id === userId))
    if (existing) return existing
    return createConversation(userId)
  }

  const deleteConversation = async (conversationId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      const currentUserId = user?.id ?? "current"
      const otherParticipantId = conversations.find((c) => c.id === conversationId)?.participants?.[0]?.id

      setConversations((prev) => prev.filter((conv) => conv.id !== conversationId))
      setMessages((prev) => {
        if (!otherParticipantId) return prev
        return prev.filter(
          (msg) =>
            !(
              (msg.senderId === otherParticipantId && msg.receiverId === currentUserId) ||
              (msg.senderId === currentUserId && msg.receiverId === otherParticipantId)
            ),
        )
      })

      setActiveConversation((prev) => {
        if (!prev || prev.id !== conversationId) return prev
        return null
      })
    } catch (err) {
      setError("Failed to delete conversation")
    } finally {
      setIsLoading(false)
    }
  }

  const unreadCount = useMemo(() => conversations.reduce((total, conv) => total + conv.unreadCount, 0), [conversations])

  const searchMessages = async (query: string) => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return messages.filter((m) => m.content.toLowerCase().includes(q))
  }

  useEffect(() => {
    if (!activeConversation) return
    void markAsRead(activeConversation.id)
  }, [activeConversation?.id])

  const value: MessagingContextType = {
    conversations,
    activeConversation,
    messages,
    unreadCount,
    isLoading,
    error,
    setActiveConversation,
    sendMessage,
    markAsRead,
    createConversation,
    getOrCreateConversation,
    deleteConversation,
    searchMessages,
  }

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>
}
