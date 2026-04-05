import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { fetchWithTimeout } from "@/lib/http"

type NominatimResponse = {
  address?: {
    city?: string
    town?: string
    village?: string
    state?: string
    country?: string
  }
}

const buildLocation = (city: string | undefined, region: string | undefined, country: string | undefined) =>
  [city, region || country].filter(Boolean).join(", ")

const coordinatesSchema = z.object({
  lat: z.coerce.number().finite().gte(-90).lte(90),
  lon: z.coerce.number().finite().gte(-180).lte(180),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const parsedCoordinates = coordinatesSchema.safeParse({
    lat: searchParams.get("lat"),
    lon: searchParams.get("lon"),
  })

  if (!parsedCoordinates.success) {
    return NextResponse.json({ error: "Missing lat/lon" }, { status: 400 })
  }

  try {
    const { lat, lon } = parsedCoordinates.data
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      String(lat),
    )}&lon=${encodeURIComponent(
      String(lon),
    )}`

    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://example.com"
    const res = await fetchWithTimeout(url, {
      cache: "no-store",
      timeoutMs: 4_000,
      headers: {
        "User-Agent": `VIAO/1.0 (+${appUrl})`,
        Accept: "application/json",
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to reverse geocode" }, { status: 502 })
    }

    const data = (await res.json()) as NominatimResponse
    const address = data.address || {}
    const city = address.city || address.town || address.village
    const region = address.state
    const country = address.country

    const location = buildLocation(city, region, country)
    if (!location) {
      return NextResponse.json({ error: "Could not determine location" }, { status: 400 })
    }

    return NextResponse.json({ city, region, country, location, source: "nominatim" })
  } catch (error) {
    console.error("GET /api/location/reverse error:", error)
    return NextResponse.json({ error: "Failed to reverse geocode" }, { status: 503 })
  }
}
