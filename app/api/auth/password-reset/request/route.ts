"use server"

import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"

const requestSchema = z.object({
  email: z.string().email(),
})

export async function POST(req: Request) {
  try {
    const json = await req.json()
    const parsed = requestSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }

    const { email } = parsed.data
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json({ error: "Invalid email" }, { status: 404 })
    }

    // In a real implementation we'd issue and send a reset code here.
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Password reset request error:", error)
    return NextResponse.json({ error: "Unable to process request" }, { status: 500 })
  }
}
