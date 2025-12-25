import { NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
})

export async function POST(req: Request) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const json = await req.json()
    const parsed = schema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 })
    }

    const { currentPassword, newPassword } = parsed.data

    const user = await prisma.user.findUnique({ where: { id: session.sub } })
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/account/change-password error:", error)
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 })
  }
}
