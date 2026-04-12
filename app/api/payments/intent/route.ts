"use server"

import { NextResponse } from "next/server"

export async function POST(req: Request) {
  void req
  return NextResponse.json(
    {
      error: "This endpoint has been retired. Use /api/stripe/checkout for organizer boost payments.",
      replacement: "/api/stripe/checkout",
    },
    { status: 410 },
  )
}
