import "server-only"

import crypto from "crypto"

import { prisma } from "@/lib/prisma"
import { getResendClient } from "@/lib/resend"

const RESET_CODE_TTL_MS = 1000 * 60 * 3

export async function sendPasswordResetCode(emailInput: string) {
  const email = emailInput.toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  })

  if (!user) {
    return { delivered: false as const }
  }

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })

  const rawCode = crypto.randomInt(100000, 1000000).toString()
  const tokenHash = crypto.createHash("sha256").update(rawCode).digest("hex")
  const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS)

  await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt,
    },
  })

  const resend = getResendClient()
  await resend.emails.send({
    from: "Viao <no-reply@viao.ch>",
    to: email,
    subject: "Your Viao password reset code",
    html: `<p>Hi ${user.name || "there"},</p><p>You requested a password reset. Use the code below to set a new password. This code expires in 3 minutes.</p><p><strong style="font-size:20px;letter-spacing:2px;">${rawCode}</strong></p><p>If you didn't request this, you can ignore this email.</p>`,
  })

  return { delivered: true as const }
}
