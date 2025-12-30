import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { makeSession, setSessionCookie } from "@/lib/session"

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 })
    }

    const userAgent = request.headers.get("user-agent")
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")
    const token = await makeSession(user, { userAgent, ip })
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          interests: (user as any).interests ?? [],
          avatarUrl: user.avatarUrl ?? undefined,
          createdAt: user.createdAt.toISOString(),
          location: (user as any).location ?? undefined,
          phone: (user as any).phone ?? undefined,
          bio: (user as any).bio ?? undefined,
          preferences: (user as any).preferences ?? undefined,
        },
      },
      { status: 200 },
    )
    setSessionCookie(response, token)
    return response
  } catch (error) {
    console.error("Login error", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
