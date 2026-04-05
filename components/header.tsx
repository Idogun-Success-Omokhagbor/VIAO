"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut, Calendar, MessageSquare, Users, Receipt, Shield } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useMessaging } from "@/context/messaging-context"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { NotificationDropdown } from "@/components/notification-dropdown"
import { BrandLockup } from "@/components/brand-logo"
import { getAvatarSrc } from "@/lib/utils"

export function Header() {
  const { user, logout, openAuthPage } = useAuth()
  const { unreadCount } = useMessaging()
  const pathname = usePathname() ?? ""

  const isActive = (path: string) => pathname === path

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2">
              <BrandLockup
                iconSize={32}
                titleClassName="text-xl font-bold text-foreground"
                subtitle=""
                className="gap-2"
              />
            </Link>

            {!user && (
              <nav className="hidden items-center gap-6 md:flex">
                <Link href="/about" className="text-sm font-medium text-[#6a5f8f] transition-colors hover:text-[#4f3a96]">
                  About
                </Link>
                <Link href="/support" className="text-sm font-medium text-[#6a5f8f] transition-colors hover:text-[#4f3a96]">
                  Support
                </Link>
                <Link href="/contact" className="text-sm font-medium text-[#6a5f8f] transition-colors hover:text-[#4f3a96]">
                  Contact
                </Link>
              </nav>
            )}

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
                <Link href="/my-events" className="hidden md:block">
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

                <Button variant="ghost" size="icon" onClick={logout} className="hidden md:inline-flex">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant="ghost"
                  className="h-10 rounded-full px-4 text-[#5e4ea6] hover:bg-[#f6f1ff] hover:text-[#4d32d6]"
                  onClick={() => openAuthPage("login")}
                >
                  Sign in
                </Button>
                <Button
                  onClick={() => openAuthPage("signup")}
                  className="h-11 rounded-full bg-[#7c5cff] px-5 text-white shadow-[0_14px_28px_rgba(124,92,255,0.24)] hover:bg-[#6c4ef7]"
                >
                  Create account
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  )
}

export default Header
