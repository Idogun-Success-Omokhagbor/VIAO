import type { AuthUser } from "@/types/auth"

type AppRole = AuthUser["role"] | null | undefined

export function getDefaultAppPath(role: AppRole) {
  switch (role) {
    case "ADMIN":
      return "/admin"
    case "ORGANIZER":
      return "/events"
    case "USER":
    default:
      return "/discover"
  }
}
