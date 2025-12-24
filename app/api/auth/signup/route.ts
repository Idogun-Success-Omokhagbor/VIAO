import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { makeSession, setSessionCookie } from "@/lib/session"

const signupSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(100),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password } = signupSchema.parse(body)

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
        role: "USER",
      },
    })

    const token = await makeSession(user)
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 },
    )
    setSessionCookie(response, token)
    return response
  } catch (error) {
    console.error("Signup error", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Signup failed" }, { status: 500 })
  }
}
