"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Home, Calendar, Users, MessageCircle } from "lucide-react"
import { useMessaging } from "@/context/messaging-context"

export default function CenterDock() {
  const pathname = usePathname()
  const { unreadCount } = useMessaging()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const navItems = [
    {
      href: "/dashboard",
      icon: Home,
      label: "Home",
      isActive: pathname === "/dashboard",
    },
    {
      href: "/events",
      icon: Calendar,
      label: "Events",
      isActive: pathname === "/events",
    },
    {
      href: "/community",
      icon: Users,
      label: "Community",
      isActive: pathname === "/community",
    },
    {
      href: "/messages",
      icon: MessageCircle,
      label: "Messages",
      isActive: pathname === "/messages",
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
  ]

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
      <div className="bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200 px-2 py-2">
        <div className="flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={item.isActive ? "default" : "ghost"}
                  size="sm"
                  className={`relative rounded-full px-4 py-2 transition-all duration-200 ${
                    item.isActive
                      ? "bg-purple-600 hover:bg-purple-700 text-white shadow-md"
                      : "text-gray-600 hover:text-purple-600 hover:bg-purple-50"
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </Badge>
                  )}
                </Button>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
