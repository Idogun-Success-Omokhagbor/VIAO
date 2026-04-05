import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { makeSession, setSessionCookie } from "@/lib/session"
import { authUserSelect, mapAuthUser } from "@/lib/current-user"
import { getClientIp } from "@/lib/request-utils"

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
})

const DUMMY_PASSWORD_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEeOU0U8J8s7GWkY1b0n2rYhM6M1.jtjA1W"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        ...authUserSelect,
        passwordHash: true,
      },
    })
    const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH
    const valid = await bcrypt.compare(password, passwordHash)

    if (!user || !user.passwordHash || !valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const userAgent = request.headers.get("user-agent")
    const ip = getClientIp(request.headers)
    const token = await makeSession(user, { userAgent, ip })
    const response = NextResponse.json(
      {
        user: mapAuthUser(user),
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
