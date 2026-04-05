"use server"

import { NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"

import { storedImageInputSchema } from "@/lib/image-schemas"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

const preferencesSchema = z.record(z.unknown()).refine(
  (value) => JSON.stringify(value).length <= 5_000,
  "Preferences payload is too large",
)

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  avatarUrl: storedImageInputSchema.optional().or(z.literal("")),
  location: z.string().max(120).optional(),
  phone: z.string().max(30).optional(),
  bio: z.string().max(1_000).optional(),
  preferences: preferencesSchema.optional(),
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
        preferences: data.preferences === undefined ? undefined : (data.preferences as Prisma.InputJsonValue),
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 })
    }
    console.error("PATCH /api/account/profile error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
