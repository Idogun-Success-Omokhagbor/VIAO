"use server"

import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

export async function POST(req: Request) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const json = await req.json()
    const parsed = subscriptionSchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })

    const expirationTime = parsed.data.expirationTime ? new Date(parsed.data.expirationTime) : null

    const saved = await (prisma as any).pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      create: {
        userId: session.sub,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        expirationTime,
      },
      update: {
        userId: session.sub,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        expirationTime,
      },
      select: { id: true },
    })

    return NextResponse.json({ success: true, id: saved.id })
  } catch (error) {
    console.error("POST /api/push/subscription error:", error)
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
  }
}

export async function DELETE() {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    await (prisma as any).pushSubscription.deleteMany({ where: { userId: session.sub } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/push/subscription error:", error)
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 })
  }
}
