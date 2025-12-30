import { NextResponse } from "next/server"
import { clearSessionCookie, getSessionUser, revokeSession } from "@/lib/session"

export async function POST() {
  const session = await getSessionUser()
  if (session?.sid) {
    await revokeSession(session.sid)
  }
  const response = NextResponse.json({ success: true })
  clearSessionCookie(response)
  return response
}
