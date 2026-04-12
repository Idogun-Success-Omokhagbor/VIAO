import "server-only"

import { prisma } from "@/lib/prisma"
import {
  mergeSiteConfigPreferences,
  parseSiteConfigSettings,
  siteConfigSettingsSchema,
} from "@/lib/site-config-settings"

export type SiteConfig = {
  siteName?: string
  supportEmail?: string
  announcement?: string
  allowSignups: boolean
  maintenanceMode: boolean
  stripeEnabled: boolean
}

export async function getSiteConfigStoreUser(fallbackAdminId?: string) {
  const canonicalAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true, preferences: true },
  })

  if (canonicalAdmin) {
    return canonicalAdmin
  }

  if (!fallbackAdminId) {
    return null
  }

  return prisma.user.findFirst({
    where: { id: fallbackAdminId, role: "ADMIN" },
    select: { id: true, preferences: true },
  })
}

export async function getSiteConfig(): Promise<SiteConfig> {
  const admin = await getSiteConfigStoreUser()
  const settings = parseSiteConfigSettings(admin?.preferences)

  return {
    siteName: settings.siteName,
    supportEmail: settings.supportEmail,
    announcement: settings.announcement,
    allowSignups: settings.allowSignups !== false,
    maintenanceMode: settings.maintenanceMode === true,
    stripeEnabled: settings.stripeEnabled !== false,
  }
}

export { mergeSiteConfigPreferences, parseSiteConfigSettings, siteConfigSettingsSchema }
export type { SiteConfigSettings } from "@/lib/site-config-settings"
