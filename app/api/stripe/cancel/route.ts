import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/session"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const sessionId = url.searchParams.get("session_id")

  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.redirect(new URL("/?payment=cancelled", url.origin))
  }

  const redirect = new URL("/events?payment=cancelled", url.origin)
  if (sessionId) redirect.searchParams.set("session_id", sessionId)
  return NextResponse.redirect(redirect)
}
