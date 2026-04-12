"use server"

import { NextResponse } from "next/server"
import { z } from "zod"

import { sendPasswordResetCode } from "@/lib/password-reset"

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

    await sendPasswordResetCode(parsed.data.email)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Password reset request error:", error)
    return NextResponse.json({ error: "Unable to process request" }, { status: 500 })
  }
}
