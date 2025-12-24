import { NextResponse } from "next/server"

export async function GET() {
  // Always return fallback mode since we're using custom map implementation
  return NextResponse.json({
    fallback: true,
    message: "Using custom map implementation",
  })
}
