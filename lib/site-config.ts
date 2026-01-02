"use server"

import { z } from "zod"

import { prisma } from "@/lib/prisma"

const adminSettingsSchema = z.object({
  siteName: z.string().max(120).optional(),
  supportEmail: z.string().email().max(200).optional(),
  allowSignups: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  announcement: z.string().max(2000).optional(),
  stripeEnabled: z.boolean().optional(),
})

export type SiteConfig = {
  siteName?: string
  supportEmail?: string
  announcement?: string
  allowSignups: boolean
  maintenanceMode: boolean
  stripeEnabled: boolean
}

function getSettingsFromPreferences(preferences: unknown): z.infer<typeof adminSettingsSchema> {
  if (!preferences || typeof preferences !== "object") return {}
  const raw = (preferences as Record<string, unknown>).adminSettings
  const parsed = adminSettingsSchema.safeParse(raw)
  return parsed.success ? parsed.data : {}
}

export async function getSiteConfig(): Promise<SiteConfig> {
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { preferences: true },
  })

  const settings = getSettingsFromPreferences(admin?.preferences)

  return {
    siteName: settings.siteName,
    supportEmail: settings.supportEmail,
    announcement: settings.announcement,
    allowSignups: settings.allowSignups !== false,
    maintenanceMode: settings.maintenanceMode === true,
    stripeEnabled: settings.stripeEnabled !== false,
  }
}
