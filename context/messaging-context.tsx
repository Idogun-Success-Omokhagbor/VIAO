"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import type { Message, Conversation, ConversationStatus } from "@/types/messaging"
import { useAuth } from "@/context/auth-context"
import { createWsClient } from "@/lib/ws-client"

const ACTIVE_POLL_MS = 5000

interface MessagingContextType {
  conversations: Conversation[]
  activeConversation: Conversation | null
  messages: Message[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  setActiveConversation: (conversation: Conversation | null) => void
  sendMessage: (conversationId: string, content: string) => Promise<void>
  markAsRead: (conversationId: string) => Promise<void>
  createConversation: (userId: string) => Promise<Conversation>
  getOrCreateConversation: (userId: string) => Promise<Conversation>
  deleteConversation: (conversationId: string) => Promise<void>
  deleteConversations: (conversationIds: string[]) => Promise<void>
  clearConversationHistory: (conversationIds: string[]) => Promise<void>
  searchMessages: (query: string) => Promise<Message[]>
  acceptConversation: (conversationId: string) => Promise<void>
  declineConversation: (conversationId: string) => Promise<void>
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
  const pathname = usePathname()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedConversations, setLoadedConversations] = useState<Set<string>>(new Set())

  const handleJson = async <T,>(res: Response) => {
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      const message = (data as any)?.error || "Request failed"
      throw new Error(message)
    }
    return data as T
  }

  const mapMessage = (m: any): Message => ({
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    content: m.content,
    timestamp: m.timestamp ?? m.createdAt ?? new Date().toISOString(),
    readAt: m.readAt ?? null,
    deliveredAt: m.deliveredAt ?? null,
    type: "text",
  })

  const fetchConversations = async () => {
    if (!user) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/messaging/conversations", { credentials: "include", cache: "no-store" })
      const data = await handleJson<{ conversations: any[] }>(res)
      const mapped = data.conversations.map((c) => ({
        ...c,
        lastMessage: c.lastMessage ? mapMessage(c.lastMessage) : undefined,
      }))

      setConversations(mapped)

      // Ensure presence (isOnline/lastSeen) stays fresh in the open chat
      setActiveConversation((prev) => {
        if (!prev) return prev
        const updated = mapped.find((c) => c.id === prev.id)
        return updated ? { ...prev, ...updated } : prev
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load conversations"
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  // WebSocket live updates
  useEffect(() => {
    if (!user?.id) return
    const client = createWsClient({
      userId: user.id,
      onMessage: (data) => {
        if (!data || typeof data !== "object") return
        if (data.type === "message:new" && data.message) {
          const m = mapMessage(data.message)
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev
            return [...prev, m]
          })
          setConversations((prev) => {
            const existing = prev.find((c) => c.id === m.conversationId)
            if (existing) {
              const unreadBump =
                m.senderId !== user.id && activeConversation?.id !== m.conversationId ? (existing.unreadCount || 0) + 1 : existing.unreadCount || 0
              return prev.map((c) =>
                c.id === m.conversationId
                  ? { ...c, lastMessage: m, unreadCount: unreadBump, updatedAt: m.timestamp }
                  : c,
              )
            }
            return prev
          })
        }
      },
    })
    return () => client.close()
  }, [user?.id, activeConversation?.id])

  const fetchMessages = async (conversationId: string) => {
    if (!user) return
    try {
      const res = await fetch(`/api/messaging/conversations/${conversationId}/messages`, {
        credentials: "include",
        cache: "no-store",
      })
      const data = await handleJson<{ messages: any[] }>(res)
      setMessages((prev) => {
        const without = prev.filter((m) => m.conversationId !== conversationId)
        const mapped = data.messages.map(mapMessage)
        const combined = [...without, ...mapped]
        const last = mapped[mapped.length - 1]
        setConversations((prevConv) =>
          prevConv.map((c) => {
            if (c.id !== conversationId) return c
            if (last) return { ...c, lastMessage: last, updatedAt: last.timestamp }
            return { ...c, lastMessage: undefined, unreadCount: 0 }
          }),
        )
        return combined
      })
      setLoadedConversations((prev) => new Set(prev).add(conversationId))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load messages"
      setError(message)
    }
  }

  useEffect(() => {
    void fetchConversations()
  }, [user?.id])

  // Poll conversations and active conversation messages for near-real-time updates
  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      void fetchConversations()
      if (activeConversation) {
        void fetchMessages(activeConversation.id).then(() => {
          if (pathname !== "/messages") return
          void markAsRead(activeConversation.id)
        })
      }
    }, ACTIVE_POLL_MS)
    return () => clearInterval(interval)
  }, [user?.id, activeConversation?.id, pathname])

  const sendMessage: MessagingContextType["sendMessage"] = async (conversationId, content) => {
    if (!content.trim()) return
    const conversation = conversations.find((c) => c.id === conversationId)
    if (!conversation) throw new Error("Conversation not found")
    if (conversation.status !== "ACCEPTED") {
      throw new Error("This conversation is pending. Wait for acceptance.")
    }

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      senderId: user?.id ?? "",
      content: content.trim(),
      timestamp: new Date().toISOString(),
      readAt: null,
      type: "text",
    }

    setMessages((prev) => [...prev, optimistic])
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: optimistic, updatedAt: new Date().toISOString(), unreadCount: c.unreadCount || 0 }
          : c,
      ),
    )

    try {
      const res = await fetch(`/api/messaging/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: content.trim() }),
      })
      const data = await handleJson<{ message: any }>(res)
      const saved = mapMessage(data.message)
      setMessages((prev) => [...prev.filter((m) => m.id !== optimistic.id), saved])
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, lastMessage: saved, updatedAt: saved.timestamp } : c)),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send message"
      setError(message)
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      throw err
    }
  }

  const markAsRead = async (conversationId: string) => {
    try {
      await fetch(`/api/messaging/conversations/${conversationId}/read`, { method: "POST", credentials: "include" })
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)))
      setMessages((prev) =>
        prev.map((m) =>
          m.conversationId === conversationId && m.senderId !== user?.id && !m.readAt
            ? { ...m, readAt: new Date().toISOString() }
            : m,
        ),
      )
    } catch {
      // silent
    }
  }

  const createConversation = async (userId: string): Promise<Conversation> => {
    const res = await fetch("/api/messaging/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId }),
    })
    const data = await handleJson<{ conversation: any }>(res)
    const conv = {
      ...data.conversation,
      lastMessage: data.conversation.lastMessage ? mapMessage(data.conversation.lastMessage) : undefined,
    } as Conversation
    setConversations((prev) => {
      const existing = prev.find((c) => c.id === conv.id)
      if (existing) return prev
      return [conv, ...prev]
    })
    void fetchMessages(conv.id)
    return conv
  }

  const getOrCreateConversation = async (userId: string): Promise<Conversation> => {
    const existing = conversations.find((conv) => conv.participants.some((p) => p.id === userId))
    if (existing) return existing
    return createConversation(userId)
  }

  const clearConversationHistory = async (conversationIds: string[]) => {
    const ids = new Set(conversationIds)
    setMessages((prev) => prev.filter((m) => !ids.has(m.conversationId)))
    setConversations((prev) =>
      prev.map((conv) => (ids.has(conv.id) ? { ...conv, lastMessage: undefined, unreadCount: 0 } : conv)),
    )

    if (activeConversation && ids.has(activeConversation.id)) {
      setActiveConversation((prev) => (prev ? { ...prev, lastMessage: undefined, unreadCount: 0 } : prev))
    }

    try {
      await Promise.all(
        conversationIds.map(async (id) => {
          const res = await fetch(`/api/messaging/conversations/${id}/clear`, { method: "POST", credentials: "include" })
          await handleJson(res)
        }),
      )

      void fetchConversations()
      if (activeConversation && ids.has(activeConversation.id)) {
        void fetchMessages(activeConversation.id)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to clear chat"
      setError(message)
      void fetchConversations()
      throw err
    }
  }

  const deleteConversations = async (conversationIds: string[]) => {
    const ids = new Set(conversationIds)
    setConversations((prev) => prev.filter((conv) => !ids.has(conv.id)))
    setMessages((prev) => prev.filter((m) => !ids.has(m.conversationId)))
    if (activeConversation && ids.has(activeConversation.id)) {
      setActiveConversation(null)
    }

    try {
      await Promise.all(
        conversationIds.map(async (id) => {
          const res = await fetch(`/api/messaging/conversations/${id}`, { method: "DELETE", credentials: "include" })
          await handleJson(res)
        }),
      )

      void fetchConversations()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete chat"
      setError(message)
      void fetchConversations()
      throw err
    }
  }

  const deleteConversation = async (conversationId: string) => deleteConversations([conversationId])

  const acceptDecline = async (conversationId: string, action: "accept" | "decline") => {
    const res = await fetch(`/api/messaging/conversations/${conversationId}/${action}`, {
      method: "POST",
      credentials: "include",
    })
    const data = await handleJson<{ status: ConversationStatus; success: boolean }>(res)
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, status: data.status, unreadCount: c.unreadCount || 0 } : c)),
    )
    setActiveConversation((prev) => (prev && prev.id === conversationId ? { ...prev, status: data.status } : prev))
  }

  const acceptConversation = (conversationId: string) => acceptDecline(conversationId, "accept")
  const declineConversation = (conversationId: string) => acceptDecline(conversationId, "decline")

  const unreadCount = useMemo(() => conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0), [conversations])

  const searchMessages = async (query: string) => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return messages.filter((m) => m.content.toLowerCase().includes(q))
  }

  useEffect(() => {
    if (!activeConversation) return
    if (!loadedConversations.has(activeConversation.id)) {
      void fetchMessages(activeConversation.id).then(() => {
        if (pathname !== "/messages") return
        void markAsRead(activeConversation.id)
      })
    } else {
      if (pathname !== "/messages") return
      void markAsRead(activeConversation.id)
    }
  }, [activeConversation?.id, pathname])

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
    deleteConversations,
    clearConversationHistory,
    searchMessages,
    acceptConversation,
    declineConversation,
  }

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>
}
