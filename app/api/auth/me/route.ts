import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

export async function GET() {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub } })

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: (user as any).avatarUrl ?? undefined,
      createdAt: user.createdAt.toISOString(),
      location: (user as any).location ?? undefined,
      phone: (user as any).phone ?? undefined,
      bio: (user as any).bio ?? undefined,
      preferences: (user as any).preferences ?? undefined,
    },
  })
}
