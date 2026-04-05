"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Compass, MessageSquare, User, Users } from "lucide-react"
import type { ComponentType } from "react"

import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
  match: (pathname: string) => boolean
}

const items: NavItem[] = [
  {
    href: "/dashboard",
    label: "Discover",
    icon: Compass,
    match: (pathname) => pathname === "/dashboard" || pathname === "/",
  },
  {
    href: "/community",
    label: "Community",
    icon: Users,
    match: (pathname) => pathname.startsWith("/community"),
  },
  {
    href: "/messages",
    label: "Messages",
    icon: MessageSquare,
    match: (pathname) => pathname.startsWith("/messages"),
  },
  {
    href: "/account",
    label: "Account",
    icon: User,
    match: (pathname) => pathname.startsWith("/account"),
  },
]

export default function AppMobileNav() {
  const pathname = usePathname() ?? ""

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e8dcff] bg-white/92 px-3 pb-[calc(0.8rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur xl:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-[20px] px-2 py-2 text-[11px] font-semibold transition-all",
                active
                  ? "bg-[#f5efff] text-[#4f33d8] shadow-[0_12px_24px_rgba(124,92,255,0.12)]"
                  : "text-[#7a709f] hover:bg-[#faf7ff] hover:text-[#4f33d8]",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
