import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { makeSession, setSessionCookie } from "@/lib/session"
import { getSiteConfig } from "@/lib/site-config"

const roleSchema = z.preprocess(
  (val) => (typeof val === "string" ? val.toUpperCase() : val),
  z.enum(["USER", "ORGANIZER"]),
)

const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(100),
  role: roleSchema.default("USER"),
  interests: z.array(z.string().min(1)).optional().default([]),
})

export async function POST(request: Request) {
  try {
    const config = await getSiteConfig()
    if (!config.allowSignups) {
      return NextResponse.json({ error: "Signups are currently disabled" }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role, interests } = signupSchema.parse(body)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        interests: interests ?? [],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        interests: true,
        avatarUrl: true,
        createdAt: true,
        location: true,
        phone: true,
        bio: true,
        preferences: true,
      },
    })

    const userAgent = request.headers.get("user-agent")
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")
    const token = await makeSession(user, { userAgent, ip })
    const response = NextResponse.json(
      {
        user: {
          ...user,
          createdAt: user.createdAt.toISOString(),
        },
      },
      { status: 201 },
    )
    setSessionCookie(response, token)
    return response
  } catch (error) {
    console.error("Signup error", error)
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of error.errors) {
        const field = typeof issue.path?.[0] === "string" ? issue.path[0] : "form"
        if (!fieldErrors[field]) {
          fieldErrors[field] =
            issue.message === "String must contain at least 8 character(s)"
              ? "Password must be at least 8 characters"
              : issue.message
        }
      }
      return NextResponse.json(
        { error: "Please correct the highlighted fields.", fieldErrors },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: "Signup failed" }, { status: 500 })
  }
}
