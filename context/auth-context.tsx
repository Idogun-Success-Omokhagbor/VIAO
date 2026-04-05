"use client"

import { createContext, useContext, useEffect, type ReactNode, useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import type { AuthUser as User } from "@/types/auth"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string, role: "USER" | "ORGANIZER", interests?: string[]) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  updateUser: (updates: Partial<User> & { preferences?: Record<string, unknown> }) => Promise<void>
  openAuthPage: (mode?: "login" | "signup") => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

type SignupError = Error & {
  fieldErrors?: Record<string, string>
}

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

export function AuthProvider({ children, initialUser }: { children: ReactNode; initialUser?: User | null }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(initialUser ?? null)
  const [isLoading, setIsLoading] = useState(initialUser === undefined)

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
    if (initialUser !== undefined) {
      setIsLoading(false)
      return
    }
    void refresh()
  }, [initialUser, refresh])

  useEffect(() => {
    if (!user) return

    const ping = async () => {
      try {
        await fetch("/api/presence/ping", { method: "POST", credentials: "include" })
      } catch {
        // ignore
      }
    }

    void ping()

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void ping()
      }
    }, 60_000)

    const onFocus = () => void ping()
    const onVisibility = () => {
      if (document.visibilityState === "visible") void ping()
    }

    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibility)

    const onBeforeUnload = () => {
      try {
        navigator.sendBeacon?.("/api/presence/ping")
      } catch {
        // ignore
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload)

    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("beforeunload", onBeforeUnload)
    }
  }, [user])

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

  const signup = async (
    name: string,
    email: string,
    password: string,
    role: "USER" | "ORGANIZER",
    interests?: string[],
  ) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name, email, password, role, interests }),
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      const err = new Error(data?.error || "Signup failed") as SignupError
      if (data?.fieldErrors) err.fieldErrors = data.fieldErrors
      throw err
    }

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

  const openAuthPage = (mode: "login" | "signup" = "login") => {
    const next =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}${window.location.hash}`
        : ""
    const params = new URLSearchParams()
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      params.set("next", next)
    }

    router.push(`/${mode === "signup" ? "signup" : "signin"}${params.toString() ? `?${params.toString()}` : ""}`)
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
        openAuthPage,
      }}
    >
      {children}
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
