"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Calendar, Compass, MessageSquare, Receipt, Shield, User, Users } from "lucide-react"

import { useAuth } from "@/context/auth-context"
import { getNavItems } from "@/lib/app-nav"
import { cn } from "@/lib/utils"

const iconMap = {
  account: User,
  admin: Shield,
  community: Users,
  discover: Compass,
  events: Calendar,
  messages: MessageSquare,
  plans: Calendar,
  receipts: Receipt,
}

export default function AppMobileNav() {
  const { user } = useAuth()
  const pathname = usePathname() ?? ""
  const items = getNavItems(user?.role)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e8dcff] bg-white/92 px-3 pb-[calc(0.8rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur xl:hidden">
      <div className="mx-auto grid max-w-lg gap-2" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ href, label, icon, match }) => {
          const active = match(pathname)
          const Icon = iconMap[icon]

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
