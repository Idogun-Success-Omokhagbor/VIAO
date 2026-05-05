import type { AuthUser } from "@/types/auth"

export type AppNavRole = AuthUser["role"] | undefined

export type AppNavItem = {
  href: string
  label: string
  icon: "account" | "admin" | "community" | "discover" | "events" | "messages" | "plans" | "receipts"
  match: (pathname: string) => boolean
  unreadBadge?: boolean
}

export function getNavItems(role?: AppNavRole): AppNavItem[] {
  if (role === "ORGANIZER") {
    return [
      {
        href: "/events",
        label: "Events",
        icon: "events",
        match: (pathname) => pathname.startsWith("/events"),
      },
      {
        href: "/discover",
        label: "Discover",
        icon: "discover",
        match: (pathname) => pathname.startsWith("/discover"),
      },
      {
        href: "/community",
        label: "Community",
        icon: "community",
        match: (pathname) => pathname.startsWith("/community"),
      },
      {
        href: "/messages",
        label: "Messages",
        icon: "messages",
        unreadBadge: true,
        match: (pathname) => pathname.startsWith("/messages"),
      },
      {
        href: "/receipts",
        label: "Receipts",
        icon: "receipts",
        match: (pathname) => pathname.startsWith("/receipts"),
      },
      {
        href: "/account",
        label: "Account",
        icon: "account",
        match: (pathname) => pathname.startsWith("/account"),
      },
    ]
  }

  if (role === "ADMIN") {
    return [
      {
        href: "/admin",
        label: "Admin",
        icon: "admin",
        match: (pathname) => pathname.startsWith("/admin"),
      },
      {
        href: "/community",
        label: "Community",
        icon: "community",
        match: (pathname) => pathname.startsWith("/community"),
      },
      {
        href: "/messages",
        label: "Messages",
        icon: "messages",
        unreadBadge: true,
        match: (pathname) => pathname.startsWith("/messages"),
      },
      {
        href: "/account",
        label: "Account",
        icon: "account",
        match: (pathname) => pathname.startsWith("/account"),
      },
    ]
  }

  return [
    {
      href: "/discover",
      label: "Discover",
      icon: "discover",
      match: (pathname) => pathname.startsWith("/discover"),
    },
    {
      href: "/my-events",
      label: "Plans",
      icon: "plans",
      match: (pathname) => pathname.startsWith("/my-events"),
    },
    {
      href: "/community",
      label: "Community",
      icon: "community",
      match: (pathname) => pathname.startsWith("/community"),
    },
    {
      href: "/messages",
      label: "Messages",
      icon: "messages",
      unreadBadge: true,
      match: (pathname) => pathname.startsWith("/messages"),
    },
    {
      href: "/account",
      label: "Account",
      icon: "account",
      match: (pathname) => pathname.startsWith("/account"),
    },
  ]
}
