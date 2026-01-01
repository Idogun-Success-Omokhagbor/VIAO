"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut, Calendar, MessageSquare, Users, Receipt, Shield } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useMessaging } from "@/context/messaging-context"
import { AuthModal } from "@/components/auth-modal"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { NotificationDropdown } from "@/components/notification-dropdown"
import { getAvatarSrc } from "@/lib/utils"

export function Header() {
  const { user, logout } = useAuth()
  const { unreadCount } = useMessaging()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const pathname = usePathname() ?? ""

  const isActive = (path: string) => pathname === path

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="font-bold text-xl">Viao</span>
            </Link>

            {user && (
              <nav className="hidden md:flex items-center space-x-6">
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary ${
                      pathname.startsWith("/admin") ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                    <span>Admin</span>
                  </Link>
                )}
                {user.role === "ORGANIZER" && (
                  <Link
                    href="/events"
                    className={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary ${
                      isActive("/events") ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Events</span>
                  </Link>
                )}
                <Link
                  href="/community"
                  className={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary ${
                    isActive("/community") ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Users className="h-4 w-4" />
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
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {unreadCount}
                    </Badge>
                  )}
                </Link>

                {user.role === "ORGANIZER" && (
                  <Link
                    href="/receipts"
                    className={`flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary ${
                      isActive("/receipts") ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <Receipt className="h-4 w-4" />
                    <span>Receipts</span>
                  </Link>
                )}
              </nav>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/my-events">
                  <Button variant="ghost" size="icon" aria-label="My Events">
                    <Calendar className="h-4 w-4" />
                  </Button>
                </Link>

                <NotificationDropdown />

                <Link href="/account" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={getAvatarSrc(user.name, user.avatarUrl)} alt={user.name} />
                    <AvatarFallback className="bg-white text-gray-900">
                      <span className="text-sm font-semibold">{(user.name || "U").slice(0, 1).toUpperCase()}</span>
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
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
