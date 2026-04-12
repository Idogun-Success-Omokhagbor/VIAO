import { z } from "zod"

export const siteConfigSettingsSchema = z.object({
  siteName: z.string().max(120).optional(),
  supportEmail: z.string().email().max(200).optional(),
  allowSignups: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  announcement: z.string().max(2000).optional(),
  stripeEnabled: z.boolean().optional(),
})

export type SiteConfigSettings = z.infer<typeof siteConfigSettingsSchema>

export function parseSiteConfigSettings(preferences: unknown): SiteConfigSettings {
  if (!preferences || typeof preferences !== "object") return {}
  const raw = (preferences as Record<string, unknown>).adminSettings
  const parsed = siteConfigSettingsSchema.safeParse(raw)
  return parsed.success ? parsed.data : {}
}

export function mergeSiteConfigPreferences(preferences: unknown, settings: SiteConfigSettings) {
  const currentPrefs =
    preferences && typeof preferences === "object" && !Array.isArray(preferences)
      ? (preferences as Record<string, unknown>)
      : {}

  return {
    ...currentPrefs,
    adminSettings: settings,
  }
}
