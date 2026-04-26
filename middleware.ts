import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify } from "jose"

const SESSION_COOKIE = "viao_session"

function getDefaultPathForRole(role: string | null) {
  switch (role) {
    case "ADMIN":
      return "/admin"
    case "ORGANIZER":
      return "/events"
    case "USER":
    default:
      return "/discover"
  }
}

function buildSignInRedirect(request: NextRequest) {
  const url = request.nextUrl.clone()
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`

  url.pathname = "/signin"
  url.search = ""

  if (next.startsWith("/") && !next.startsWith("//")) {
    url.searchParams.set("next", next)
  }

  return url
}

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
    "/discover",
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
    return NextResponse.redirect(buildSignInRedirect(request))
  }

  const role = await getRoleFromSessionToken(token)

  if (!role) {
    return NextResponse.redirect(buildSignInRedirect(request))
  }

  const adminOnly = pathname === "/admin" || pathname.startsWith("/admin/")
  if (adminOnly && role !== "ADMIN") {
    const url = request.nextUrl.clone()
    url.pathname = getDefaultPathForRole(role)
    return NextResponse.redirect(url)
  }

  const organizerOnly =
    pathname === "/events" ||
    pathname === "/events/manage" ||
    pathname.startsWith("/events/manage/") ||
    pathname === "/receipts" ||
    pathname.startsWith("/receipts/")
  if (organizerOnly && role !== "ORGANIZER" && role !== "ADMIN") {
    const url = request.nextUrl.clone()
    url.pathname = getDefaultPathForRole(role)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/discover/:path*",
    "/community/:path*",
    "/messages/:path*",
    "/account/:path*",
    "/profile/:path*",
    "/my-events/:path*",
    "/events/:path*",
    "/receipts/:path*",
  ],
}
