import type React from "react"

import AppMobileNav from "@/components/app-mobile-nav"
import Header from "@/components/header"
import FloatingButton from "@/components/floating-button"
import { CommunityProvider } from "@/context/community-context"
import { EventsProvider } from "@/context/events-context"
import { getSiteConfig } from "@/lib/site-config"

type SiteConfig = {
  maintenanceMode?: boolean
  announcement?: string
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const siteConfig: SiteConfig | null = await getSiteConfig().catch(() => null)

  return (
    <EventsProvider>
      <CommunityProvider>
        <div className="min-h-[100dvh] bg-gray-50 flex flex-col overflow-x-hidden">
          <Header />
          {siteConfig?.maintenanceMode ? (
            <div className="border-b bg-amber-50 px-4 py-2 text-sm text-amber-900">
              {siteConfig.announcement?.trim() ? siteConfig.announcement : "The site is currently in maintenance mode."}
            </div>
          ) : null}
          <main className="flex-1 overflow-x-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom))] xl:pb-0">{children}</main>
          <AppMobileNav />
          <FloatingButton />
        </div>
      </CommunityProvider>
    </EventsProvider>
  )
}
