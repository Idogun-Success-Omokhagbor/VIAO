import { NextResponse } from "next/server"

import { getSiteConfig } from "@/lib/site-config"

export async function GET() {
  try {
    const config = await getSiteConfig()
    return NextResponse.json({ config })
  } catch (error) {
    console.error("GET /api/site-config error:", error)
    return NextResponse.json({ error: "Failed to load site configuration" }, { status: 500 })
  }
}
