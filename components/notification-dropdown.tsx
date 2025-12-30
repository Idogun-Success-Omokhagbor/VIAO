"use client"

import type React from "react"

import { useCallback, useMemo } from "react"
import { Bell, MessageCircle, Heart, MessageSquareText, Reply } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNotifications } from "@/context/notification-context"
import { formatTimeAgo } from "@/lib/utils"

const typeMeta: Record<
  "MESSAGE" | "LIKE" | "COMMENT" | "REPLY",
  { icon: React.ReactNode; color: string }
> = {
  MESSAGE: { icon: <MessageCircle className="h-4 w-4 text-purple-600" />, color: "bg-purple-50" },
  LIKE: { icon: <Heart className="h-4 w-4 text-rose-600" />, color: "bg-rose-50" },
  COMMENT: { icon: <MessageSquareText className="h-4 w-4 text-blue-600" />, color: "bg-blue-50" },
  REPLY: { icon: <Reply className="h-4 w-4 text-amber-600" />, color: "bg-amber-50" },
}

export function NotificationDropdown() {
  const router = useRouter()
  const { notifications, unreadCount, markAsRead, markAllAsRead, refresh } = useNotifications()

  const sorted = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notifications],
  )

  const handleNavigate = useCallback(
    (n: (typeof notifications)[number]) => {
      if (n.type === "MESSAGE" && n.data && (n.data as any).conversationId) {
        router.push(`/messages?conversationId=${(n.data as any).conversationId}`)
      } else if (n.data && (n.data as any).postId) {
        router.push(`/community?post=${(n.data as any).postId}`)
      }
      void markAsRead([n.id])
    },
    [markAsRead, router],
  )

  const displayCount = unreadCount > 99 ? "99+" : unreadCount

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications" onClick={() => void refresh()}>
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 px-1 rounded-full text-[10px]">
              {displayCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" sideOffset={12}>
        <DropdownMenuLabel className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Notifications</p>
            <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
          </div>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs px-2" onClick={() => void markAllAsRead()}>
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-96 hide-scrollbar">
          {sorted.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : (
            sorted.map((n) => {
              const meta = typeMeta[n.type] ?? typeMeta.MESSAGE
              return (
                <DropdownMenuItem
                  key={n.id}
                  className={`flex items-start gap-3 py-3 ${n.readAt ? "" : "bg-muted/40"}`}
                  onClick={() => handleNavigate(n)}
                >
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center ${meta.color}`}>{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                    <p className="text-[11px] text-muted-foreground mt-1">{formatTimeAgo(n.createdAt)}</p>
                  </div>
                  {!n.readAt && <span className="h-2 w-2 rounded-full bg-purple-600 mt-1" />}
                </DropdownMenuItem>
              )
            })
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NotificationDropdown
