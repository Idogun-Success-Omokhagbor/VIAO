"use server"

import { NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"

import { prisma } from "@/lib/prisma"
import { getResendClient } from "@/lib/resend"

const schema = z.object({
  email: z.string().email(),
})

const RESET_CODE_TTL_MS = 1000 * 60 * 3 // 3 minutes

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }

    const email = parsed.data.email.toLowerCase()
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // Do not leak existence
      return NextResponse.json({ success: true })
    }

    // Clear existing tokens for this user
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })

    const rawCode = ("" + Math.floor(100000 + Math.random() * 900000)).substring(0, 6) // 6-digit code
    const tokenHash = crypto.createHash("sha256").update(rawCode).digest("hex")
    const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS)

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    })

    try {
      const resend = getResendClient()
      await resend.emails.send({
        from: "Viao <no-reply@viao.ch>",
        to: email,
        subject: "Your Viao password reset code",
        html: `<p>Hi ${user.name || "there"},</p><p>You requested a password reset. Use the code below to set a new password. This code expires in 3 minutes.</p><p><strong style="font-size:20px;letter-spacing:2px;">${rawCode}</strong></p><p>If you didn't request this, you can ignore this email.</p>`,
      })
    } catch (err) {
      console.error("Resend send error", err)
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/auth/forgot-password error:", error)
    return NextResponse.json({ error: "Unable to process request" }, { status: 500 })
  }
}
