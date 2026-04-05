import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import type { AuthUser } from "@/types/auth"

export const authUserSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  name: true,
  email: true,
  role: true,
  interests: true,
  avatarUrl: true,
  createdAt: true,
  location: true,
  phone: true,
  bio: true,
  preferences: true,
})

export type AuthUserRecord = Prisma.UserGetPayload<{
  select: typeof authUserSelect
}>

export function mapAuthUser(user: AuthUserRecord): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    interests: Array.isArray(user.interests) ? user.interests : [],
    avatarUrl: user.avatarUrl ?? undefined,
    createdAt: user.createdAt.toISOString(),
    location: user.location ?? undefined,
    phone: user.phone ?? undefined,
    bio: user.bio ?? undefined,
    preferences:
      user.preferences && typeof user.preferences === "object"
        ? (user.preferences as Record<string, unknown>)
        : undefined,
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSessionUser()
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: authUserSelect,
  })

  if (!user) return null

  return mapAuthUser(user)
}
