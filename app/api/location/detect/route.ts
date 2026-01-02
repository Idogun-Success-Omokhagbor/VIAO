import { headers } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type GeoLookupResponse = {
  city?: string
  region?: string
  country?: string
}

const buildLocation = ({ city, region, country }: GeoLookupResponse) =>
  [city, region || country].filter(Boolean).join(", ")

export async function GET() {
  try {
    const hdrs = headers()

    const headerCity = hdrs.get("x-vercel-ip-city") ?? undefined
    const headerRegion = hdrs.get("x-vercel-ip-country-region") ?? undefined
    const headerCountry = hdrs.get("x-vercel-ip-country") ?? undefined

    const headerLocation = buildLocation({ city: headerCity, region: headerRegion, country: headerCountry })
    if (headerLocation) {
      return NextResponse.json({
        city: headerCity,
        region: headerRegion,
        country: headerCountry,
        location: headerLocation,
        source: "headers",
      })
    }

    const ipRes = await fetch("https://ipapi.co/json/", { cache: "no-store" })
    if (!ipRes.ok) {
      throw new Error("ip lookup failed")
    }
    const data = (await ipRes.json()) as { city?: string; region?: string; country_name?: string; country?: string }
    const location = buildLocation({
      city: data.city,
      region: data.region,
      country: data.country_name || data.country,
    })

    if (!location) {
      return NextResponse.json({ error: "Could not determine location" }, { status: 400 })
    }

    return NextResponse.json({
      city: data.city,
      region: data.region,
      country: data.country_name || data.country,
      location,
      source: "ipapi",
    })
  } catch (error) {
    console.error("GET /api/location/detect error:", error)
    return NextResponse.json({ error: "Failed to detect location" }, { status: 500 })
  }
}
