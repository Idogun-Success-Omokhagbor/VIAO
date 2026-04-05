import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/session"
import { getPublicAppUrl } from "@/lib/stripe-boost"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const sessionId = url.searchParams.get("session_id")
  const publicOrigin = getPublicAppUrl(req, url.origin)
  if (!publicOrigin) {
    return NextResponse.json({ error: "Missing app URL" }, { status: 500 })
  }

  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.redirect(new URL("/?payment=cancelled", publicOrigin))
  }

  const redirect = new URL("/events?payment=cancelled", publicOrigin)
  if (sessionId) redirect.searchParams.set("session_id", sessionId)
  return NextResponse.redirect(redirect)
}
