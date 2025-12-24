import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { verifySessionToken, createSessionToken, type SessionPayload } from "./auth"
import type { User } from "@prisma/client"

const SESSION_COOKIE = "viao_session"
const THIRTY_DAYS = 60 * 60 * 24 * 30

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 })
}

export async function getSessionUser(): Promise<SessionPayload | null> {
  const cookieStore = cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    return await verifySessionToken(token)
  } catch {
    return null
  }
}

export async function makeSession(user: User) {
  const payload: SessionPayload = { sub: user.id, role: user.role, email: user.email }
  return createSessionToken(payload)
}
