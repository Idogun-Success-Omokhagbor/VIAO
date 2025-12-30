import { NextRequest, NextResponse } from "next/server"

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get("lat")
  const lon = searchParams.get("lon")

  if (!lat || !lon) {
    return NextResponse.json({ error: "Missing lat/lon" }, { status: 400 })
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(
      lon,
    )}`

    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "VIAO (location reverse geocode)",
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
    return NextResponse.json({ error: "Failed to reverse geocode" }, { status: 500 })
  }
}
