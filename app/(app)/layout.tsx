"use client"

import type React from "react"
import { useEffect, useState } from "react"

import Header from "@/components/header"
import FloatingButton from "@/components/floating-button"

type SiteConfig = {
  maintenanceMode?: boolean
  announcement?: string
}

type SiteConfigResponse = {
  config?: SiteConfig
  error?: string
}

function getErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined
  const msg = (payload as { error?: unknown }).error
  return typeof msg === "string" ? msg : undefined
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch("/api/site-config", { cache: "no-store", credentials: "include" })
        const json = (await res.json().catch(() => null)) as unknown
        if (!res.ok) throw new Error(getErrorMessage(json) || "Failed to load site configuration")
        const config = (json && typeof json === "object" ? (json as SiteConfigResponse) : null)?.config
        if (!cancelled) setSiteConfig(config ?? null)
      } catch {
        if (!cancelled) setSiteConfig(null)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <Header />
      {siteConfig?.maintenanceMode ? (
        <div className="border-b bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {siteConfig.announcement?.trim() ? siteConfig.announcement : "The site is currently in maintenance mode."}
        </div>
      ) : null}
      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
      <FloatingButton />
    </div>
  )
}
