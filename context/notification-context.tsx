"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

export type NotificationItem = {
  id: string
  type: "MESSAGE" | "LIKE" | "COMMENT" | "REPLY"
  title: string
  body?: string | null
  data?: Record<string, unknown> | null
  readAt: string | null
  createdAt: string
}

interface NotificationContextType {
  notifications: NotificationItem[]
  unreadCount: number
  markAsRead: (ids: string[]) => Promise<void>
  markAllAsRead: () => Promise<void>
  refresh: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider")
  return ctx
}

const POLL_MS = 10000

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const lastFetchRef = useRef<number>(0)

  const refresh = async () => {
    try {
      const res = await fetch("/api/notifications?limit=50", { credentials: "include", cache: "no-store" })
      if (!res.ok) return
      const data = (await res.json()) as { notifications: NotificationItem[]; unreadCount: number }
      const incomingIds = new Set(data.notifications.map((n) => n.id))
      const newOnes = data.notifications.filter((n) => !seenIdsRef.current.has(n.id))

      data.notifications.forEach((n) => seenIdsRef.current.add(n.id))
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
      lastFetchRef.current = Date.now()
    } catch {
      // silent fail
    }
  }

  useEffect(() => {
    void refresh()
    const interval = setInterval(() => {
      void refresh()
    }, POLL_MS)
    return () => clearInterval(interval)
  }, [])

  const markAsRead = async (ids: string[]) => {
    if (!ids.length) return
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids }),
      })
      setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, readAt: new Date().toISOString() } : n)))
      setUnreadCount((prev) => {
        const newlyRead = notifications.filter((n) => ids.includes(n.id) && !n.readAt).length
        return Math.max(0, prev - newlyRead)
      })
    } catch {
      // silent
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ markAll: true }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })))
      setUnreadCount(0)
    } catch {
      // silent
    }
  }

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      refresh,
    }),
    [notifications, unreadCount],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
