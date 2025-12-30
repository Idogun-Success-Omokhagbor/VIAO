import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { verifySessionToken, createSessionToken, type SessionPayload } from "./auth"
import type { User } from "@prisma/client"

import { prisma } from "@/lib/prisma"

const SESSION_COOKIE = "viao_session"
const THIRTY_DAYS = 60 * 60 * 24 * 30

type SessionUser = Pick<User, "id" | "role" | "email">

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
    const payload = await verifySessionToken(token)

    if (!payload.sid) return payload

    const session = await (prisma as any).session.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    })

    if (!session) return null

    return payload
  } catch {
    return null
  }
}

export async function makeSession(
  user: SessionUser,
  meta?: {
    userAgent?: string | null
    ip?: string | null
  },
) {
  const expiresAt = new Date(Date.now() + THIRTY_DAYS * 1000)

  const session = await (prisma as any).session.create({
    data: {
      userId: user.id,
      userAgent: meta?.userAgent ?? null,
      ip: meta?.ip ?? null,
      expiresAt,
      lastSeenAt: new Date(),
    },
    select: { id: true },
  })

  const payload: SessionPayload = { sub: user.id, role: user.role, email: user.email, sid: session.id }
  return createSessionToken(payload)
}

export async function revokeSession(sessionId: string) {
  try {
    await (prisma as any).session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
      select: { id: true },
    })
  } catch {
  }
}

export async function revokeOtherSessions(userId: string, currentSessionId: string) {
  await (prisma as any).session.updateMany({
    where: { userId, revokedAt: null, id: { not: currentSessionId } },
    data: { revokedAt: new Date() },
  })
}
