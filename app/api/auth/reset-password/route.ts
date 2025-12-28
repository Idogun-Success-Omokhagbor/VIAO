"use server"

import { NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"
import bcrypt from "bcryptjs"

import { prisma } from "@/lib/prisma"

const schema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(6),
  password: z.string().min(8).max(100).optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const { email, code, password } = parsed.data
    const tokenHash = crypto.createHash("sha256").update(code).digest("hex")

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 })
    }

    const record = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, userId: user.id },
    })

    if (!record || record.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 })
    }

    // If password not provided, just validate code
    if (!password) {
      return NextResponse.json({ success: true, codeValid: true })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/auth/reset-password error:", error)
    return NextResponse.json({ error: "Unable to reset password" }, { status: 500 })
  }
}
