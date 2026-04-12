import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import {
  getSiteConfigStoreUser,
  mergeSiteConfigPreferences,
  parseSiteConfigSettings,
  siteConfigSettingsSchema,
  type SiteConfigSettings,
} from "@/lib/site-config"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export async function GET() {
  const session = await getSessionUser()
  if (!session || session.role !== "ADMIN") return forbidden()

  const storeUser = await getSiteConfigStoreUser(session.sub)
  if (!storeUser) {
    return NextResponse.json({ error: "No admin settings store found" }, { status: 404 })
  }

  const settings = parseSiteConfigSettings(storeUser.preferences)

  return NextResponse.json({ settings })
}

export async function PATCH(req: Request) {
  const session = await getSessionUser()
  if (!session || session.role !== "ADMIN") return forbidden()

  const body = (await req.json().catch(() => null)) as unknown
  const parsed = siteConfigSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings" }, { status: 400 })
  }

  const storeUser = await getSiteConfigStoreUser(session.sub)
  if (!storeUser) {
    return NextResponse.json({ error: "No admin settings store found" }, { status: 404 })
  }

  const currentSettings = parseSiteConfigSettings(storeUser.preferences)

  const nextSettings: SiteConfigSettings = {
    ...currentSettings,
    ...parsed.data,
  }

  const nextPrefs = mergeSiteConfigPreferences(storeUser.preferences, nextSettings)

  await prisma.user.update({ where: { id: storeUser.id }, data: { preferences: nextPrefs } })

  return NextResponse.json({ ok: true, settings: nextSettings })
}
