"use client"

import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react"
import { AuthModal } from "@/components/auth-modal"

interface User {
  id: string
  name: string
  email: string
  role: "USER" | "ORGANIZER" | "ADMIN"
  avatarUrl?: string
  createdAt?: string
  location?: string
  phone?: string
  bio?: string
  preferences?: Record<string, unknown>
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  updateUser: (updates: Partial<User> & { preferences?: Record<string, unknown> }) => Promise<void>
  showAuthModal: (mode?: "login" | "signup") => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function handleJson<T>(resPromise: Response | Promise<Response>, opts?: { suppressError?: boolean }): Promise<T | null> {
  const res = await resPromise
  if (!res.ok) {
    if (opts?.suppressError) return null
    let message = "Request failed"
    try {
      const data = await res.json()
      message = data.error || message
    } catch {
      // ignore
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<"login" | "signup">("login")

  const refresh = useCallback(async () => {
    try {
      const data = await handleJson<{ user: User }>(fetch("/api/auth/me", { credentials: "include" }), { suppressError: true })
      if (data?.user) {
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    })
    const data = await handleJson<{ user: User }>(res)
    if (!data?.user) throw new Error("Login failed")
    setUser(data.user)
  }

  const signup = async (name: string, email: string, password: string) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    })
    const data = await handleJson<{ user: User }>(res)
    if (!data?.user) throw new Error("Signup failed")
    setUser(data.user)
  }

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
    setUser(null)
  }

  const updateUser = async (updates: Partial<User> & { preferences?: Record<string, unknown> }) => {
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updates),
    })
    const data = await handleJson<{ user: User }>(res)
    if (!data?.user) throw new Error("Profile update failed")
    setUser(data.user)
  }

  const showAuthModal = (mode: "login" | "signup" = "login") => {
    setAuthModalMode(mode)
    setAuthModalOpen(true)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refresh,
        updateUser,
        showAuthModal,
      }}
    >
      {children}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialTab={authModalMode === "signup" ? "signup" : "signin"} />
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
