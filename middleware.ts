import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify } from "jose"

const SESSION_COOKIE = "viao_session"

async function getRoleFromSessionToken(token: string): Promise<string | null> {
  const secret = process.env.AUTH_SECRET
  if (!secret) return null

  try {
    const encoder = new TextEncoder()
    const secretKey = encoder.encode(secret)
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] })
    const role = typeof payload.role === "string" ? payload.role : null
    return role
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const protectedRoots = [
    "/admin",
    "/dashboard",
    "/community",
    "/messages",
    "/account",
    "/profile",
    "/my-events",
    "/events",
    "/receipts",
  ]

  const isProtected = protectedRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`))
  if (!isProtected) return NextResponse.next()

  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  const role = await getRoleFromSessionToken(token)

  if (!role) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  const adminOnly = pathname === "/admin" || pathname.startsWith("/admin/")
  if (adminOnly && role !== "ADMIN") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  const organizerOnly = pathname === "/events" || pathname.startsWith("/events/") || pathname === "/receipts" || pathname.startsWith("/receipts/")
  if (organizerOnly && role !== "ORGANIZER" && role !== "ADMIN") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/community/:path*",
    "/messages/:path*",
    "/account/:path*",
    "/profile/:path*",
    "/my-events/:path*",
    "/events/:path*",
    "/receipts/:path*",
  ],
}
