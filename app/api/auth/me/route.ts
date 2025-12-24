import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

export async function GET() {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      createdAt: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({ user })
}
