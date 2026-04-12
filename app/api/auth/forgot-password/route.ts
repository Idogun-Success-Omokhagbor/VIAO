"use server"

import { NextResponse } from "next/server"
import { z } from "zod"
import { sendPasswordResetCode } from "@/lib/password-reset"

const schema = z.object({
  email: z.string().email(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }

    await sendPasswordResetCode(parsed.data.email)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/auth/forgot-password error:", error)
    return NextResponse.json({ error: "Unable to process request" }, { status: 500 })
  }
}
