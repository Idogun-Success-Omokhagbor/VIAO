"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode, useCallback } from "react"
import { useAuth } from "@/context/auth-context"

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
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const seenIdsRef = useRef<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await fetch("/api/notifications?limit=50", { credentials: "include", cache: "no-store" })
      if (!res.ok) return
      const data = (await res.json()) as { notifications: NotificationItem[]; unreadCount: number }
      data.notifications.forEach((n) => seenIdsRef.current.add(n.id))
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch {
      // silent fail
    }
  }, [user?.id])

  useEffect(() => {
    if (!user) {
      seenIdsRef.current = new Set()
      setNotifications([])
      setUnreadCount(0)
      return
    }

    const refreshIfVisible = () => {
      if (document.visibilityState === "hidden") return
      void refresh()
    }

    refreshIfVisible()
    const interval = setInterval(refreshIfVisible, POLL_MS)
    document.addEventListener("visibilitychange", refreshIfVisible)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", refreshIfVisible)
    }
  }, [refresh, user])

  const markAsRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids }),
      })
      setNotifications((prev) =>
        {
          let newlyRead = 0
          const next = prev.map((n) => {
            if (!ids.includes(n.id) || n.readAt) return n
            newlyRead += 1
            return { ...n, readAt: new Date().toISOString() }
          })

          if (newlyRead > 0) {
            setUnreadCount((count) => Math.max(0, count - newlyRead))
          }

          return next
        },
      )
    } catch {
      // silent
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
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
  }, [])

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      refresh,
    }),
    [markAllAsRead, markAsRead, notifications, refresh, unreadCount],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
