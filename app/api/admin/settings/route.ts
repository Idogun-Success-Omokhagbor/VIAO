import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

const settingsSchema = z.object({
  siteName: z.string().max(120).optional(),
  supportEmail: z.string().email().max(200).optional(),
  allowSignups: z.boolean().optional(),
  maintenanceMode: z.boolean().optional(),
  announcement: z.string().max(2000).optional(),
  stripeEnabled: z.boolean().optional(),
})

type AdminSettings = z.infer<typeof settingsSchema>

function getSettingsFromPreferences(preferences: unknown): AdminSettings {
  if (!preferences || typeof preferences !== "object") return {}
  const raw = (preferences as any).adminSettings
  const parsed = settingsSchema.safeParse(raw)
  return parsed.success ? parsed.data : {}
}

export async function GET() {
  const session = await getSessionUser()
  if (!session || session.role !== "ADMIN") return forbidden()

  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { preferences: true } })
  const settings = getSettingsFromPreferences(user?.preferences)

  return NextResponse.json({ settings })
}

export async function PATCH(req: Request) {
  const session = await getSessionUser()
  if (!session || session.role !== "ADMIN") return forbidden()

  const body = (await req.json().catch(() => null)) as unknown
  const parsed = settingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings" }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { id: session.sub }, select: { preferences: true } })
  const currentPrefs = existing?.preferences
  const currentSettings = getSettingsFromPreferences(currentPrefs)

  const nextSettings: AdminSettings = {
    ...currentSettings,
    ...parsed.data,
  }

  const nextPrefs = {
    ...(typeof currentPrefs === "object" && currentPrefs ? (currentPrefs as any) : {}),
    adminSettings: nextSettings,
  }

  await prisma.user.update({ where: { id: session.sub }, data: { preferences: nextPrefs } })

  return NextResponse.json({ ok: true, settings: nextSettings })
}
