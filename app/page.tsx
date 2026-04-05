import { redirect } from "next/navigation"

import HomePageClient from "@/components/home-page-client"
import { getCurrentUser } from "@/lib/current-user"
import { listPublicEvents } from "@/lib/public-events"
import { getSiteConfig } from "@/lib/site-config"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const user = await getCurrentUser()
  if (user) {
    redirect("/dashboard")
  }

  const [eventsResult, siteConfigResult] = await Promise.allSettled([listPublicEvents(), getSiteConfig()])

  const initialEvents = eventsResult.status === "fulfilled" ? eventsResult.value : []
  const siteConfig = siteConfigResult.status === "fulfilled" ? siteConfigResult.value : null
  const loadError = eventsResult.status === "rejected" ? "Failed to load events" : null

  return <HomePageClient initialEvents={initialEvents} siteConfig={siteConfig} loadError={loadError} />
}
