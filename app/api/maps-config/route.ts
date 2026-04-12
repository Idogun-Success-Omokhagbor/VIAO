import { NextResponse } from "next/server"

export async function GET() {
  const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "").trim()
  const mapId = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "").trim()
  const enabled = apiKey.length > 0
  const mapIdConfigured = mapId.length > 0 && mapId !== "DEMO_MAP_ID"

  return NextResponse.json({
    enabled,
    fallback: !enabled,
    mapIdConfigured,
    provider: enabled ? "google-maps" : "fallback",
    message: enabled
      ? "Google Maps credentials are configured."
      : "Google Maps credentials are not configured. Falling back to the custom map experience.",
  })
}
