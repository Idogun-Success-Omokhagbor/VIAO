import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { verifySessionToken, createSessionToken, type SessionPayload } from "./auth"
import type { User } from "@prisma/client"

import { prisma } from "@/lib/prisma"

const SESSION_COOKIE = "viao_session"
const THIRTY_DAYS = 60 * 60 * 24 * 30
const LOCAL_SESSION_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])

type SessionUser = Pick<User, "id" | "role" | "email">

function isLocalSessionHost(hostname: string) {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase()
  return LOCAL_SESSION_HOSTS.has(normalized) || normalized.endsWith(".localhost")
}

function shouldUseSecureSessionCookie(request?: Request) {
  const fallback = process.env.NODE_ENV === "production"
  if (!request) return fallback

  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase()
  if (forwardedProto) {
    return forwardedProto === "https"
  }

  try {
    const { protocol, hostname } = new URL(request.url)
    if (isLocalSessionHost(hostname)) {
      return false
    }
    return protocol === "https:"
  } catch {
    return fallback
  }
}

export function setSessionCookie(response: NextResponse, token: string, request?: Request) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: shouldUseSecureSessionCookie(request),
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS,
  })
}

export function clearSessionCookie(response: NextResponse, request?: Request) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: shouldUseSecureSessionCookie(request),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
}

export async function getSessionUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const payload = await verifySessionToken(token)

    if (!payload.sid) return payload

    const session = await prisma.session.findFirst({
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

  const session = await prisma.session.create({
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
    await prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
      select: { id: true },
    })
  } catch {
  }
}

export async function revokeOtherSessions(userId: string, currentSessionId: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null, id: { not: currentSessionId } },
    data: { revokedAt: new Date() },
  })
}
