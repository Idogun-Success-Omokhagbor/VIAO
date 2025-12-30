"use client"

import { createContext, useContext, useMemo, useState, type ReactNode } from "react"

import ProfileModal from "@/components/profile-modal"

type ProfileModalContextValue = {
  isOpen: boolean
  userId: string | null
  openProfile: (userId: string) => void
  closeProfile: () => void
}

const ProfileModalContext = createContext<ProfileModalContextValue | undefined>(undefined)

export function ProfileModalProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const isOpen = !!userId

  const value = useMemo<ProfileModalContextValue>(() => {
    return {
      isOpen,
      userId,
      openProfile: (nextUserId: string) => setUserId(nextUserId),
      closeProfile: () => setUserId(null),
    }
  }, [isOpen, userId])

  return (
    <ProfileModalContext.Provider value={value}>
      {children}
      <ProfileModal isOpen={isOpen} userId={userId} onClose={() => setUserId(null)} />
    </ProfileModalContext.Provider>
  )
}

export function useProfileModal() {
  const ctx = useContext(ProfileModalContext)
  if (!ctx) throw new Error("useProfileModal must be used within a ProfileModalProvider")
  return ctx
}
