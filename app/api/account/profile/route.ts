"use server"

import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

const dataImageUrlSchema = z
  .string()
  .max(8_000_000)
  .regex(/^data:image\/[^;]+;base64,[A-Za-z0-9+/=]+$/)

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.union([z.string().url(), dataImageUrlSchema]).optional().or(z.literal("")),
  location: z.string().optional(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  preferences: z.record(z.any()).optional(),
})

export async function PATCH(req: Request) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const json = await req.json()
    const parsed = updateSchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 })

    const data = parsed.data
    const updated = await prisma.user.update({
      where: { id: session.sub },
      data: {
        name: data.name ?? undefined,
        email: data.email ?? undefined,
        avatarUrl: data.avatarUrl === "" ? null : data.avatarUrl ?? undefined,
        location: data.location ?? undefined,
        phone: data.phone ?? undefined,
        bio: data.bio ?? undefined,
        preferences: data.preferences ?? undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        location: true,
        phone: true,
        bio: true,
        preferences: true,
      },
    })

    return NextResponse.json({ user: { ...updated, createdAt: updated.createdAt.toISOString() } })
  } catch (error) {
    console.error("PATCH /api/account/profile error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
