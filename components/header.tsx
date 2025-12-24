"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, User, LogOut, Settings, Calendar, MessageSquare, MapPin } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { AuthModal } from "@/components/auth-modal"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function Header() {
  const { user, logout } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="font-bold text-xl">Viao</span>
            </Link>

            {user && (
              <nav className="hidden md:flex items-center space-x-6">
                <Link
                  href="/dashboard"
                  className={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary ${
                    isActive("/dashboard") ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <MapPin className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/events"
                  className={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary ${
                    isActive("/events") ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  <span>Events</span>
                </Link>
                <Link
                  href="/community"
                  className={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary ${
                    isActive("/community") ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Community</span>
                </Link>
                <Link
                  href="/messages"
                  className={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary ${
                    isActive("/messages") ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Messages</span>
                  <Badge variant="secondary" className="ml-1">
                    3
                  </Badge>
                </Link>
              </nav>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                    2
                  </Badge>
                </Button>

                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>

                <Link href="/account">
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>

                <Button variant="ghost" size="icon" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button onClick={() => setShowAuthModal(true)}>Get Started</Button>
            )}
          </div>
        </div>
      </header>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  )
}

export default Header
