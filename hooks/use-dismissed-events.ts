"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

const STORAGE_KEY_PREFIX = "viao.dismissed-events"

function getStorageKey(userId?: string | null) {
  return `${STORAGE_KEY_PREFIX}.${userId ?? "guest"}`
}

function readDismissedEvents(userId?: string | null) {
  if (typeof window === "undefined") return []

  try {
    const value = window.localStorage.getItem(getStorageKey(userId))
    if (!value) return []
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
  } catch {
    return []
  }
}

export function useDismissedEvents(userId?: string | null) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([])

  useEffect(() => {
    setDismissedIds(readDismissedEvents(userId))
  }, [userId])

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      window.localStorage.setItem(getStorageKey(userId), JSON.stringify(dismissedIds))
    } catch {
      // ignore storage errors
    }
  }, [dismissedIds, userId])

  const dismissedSet = useMemo(() => new Set(dismissedIds), [dismissedIds])

  const dismissEvent = useCallback((eventId: string) => {
    setDismissedIds((current) => (current.includes(eventId) ? current : [...current, eventId]))
  }, [])

  const restoreEvent = useCallback((eventId: string) => {
    setDismissedIds((current) => current.filter((id) => id !== eventId))
  }, [])

  const clearDismissedEvents = useCallback(() => {
    setDismissedIds([])
  }, [])

  return {
    dismissedIds,
    dismissedSet,
    dismissEvent,
    restoreEvent,
    clearDismissedEvents,
  }
}
