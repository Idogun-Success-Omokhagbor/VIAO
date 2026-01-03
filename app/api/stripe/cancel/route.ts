import { NextResponse } from "next/server"

import { getSessionUser } from "@/lib/session"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const sessionId = url.searchParams.get("session_id")

  const normalizeUrl = (value: string | null | undefined) => {
    if (!value) return null
    const trimmed = value.trim()
    if (!trimmed) return null
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    return withProto.replace(/\/+$/, "")
  }

  const isLocalhostUrl = (value: string | null | undefined) => {
    if (!value) return false
    try {
      const host = new URL(value).hostname
      return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0"
    } catch {
      return false
    }
  }

  const envAppUrl = normalizeUrl(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL)
  const forwardedProto = (req.headers.get("x-forwarded-proto") || "").split(",")[0]?.trim() || ""
  const forwardedHost = (req.headers.get("x-forwarded-host") || "").split(",")[0]?.trim() || ""
  const host = (req.headers.get("host") || "").split(",")[0]?.trim() || ""
  const derived = normalizeUrl(forwardedHost ? `${forwardedProto || "https"}://${forwardedHost}` : host ? `${forwardedProto || "https"}://${host}` : null)

  const publicOrigin = (envAppUrl && !isLocalhostUrl(envAppUrl) ? envAppUrl : derived || url.origin)

  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.redirect(new URL("/?payment=cancelled", publicOrigin))
  }

  const redirect = new URL("/events?payment=cancelled", publicOrigin)
  if (sessionId) redirect.searchParams.set("session_id", sessionId)
  return NextResponse.redirect(redirect)
}
