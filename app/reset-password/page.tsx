import { redirect } from "next/navigation"

import { ResetPasswordPageClient } from "@/components/reset-password-page-client"
import { getCurrentUser } from "@/lib/current-user"
import { getDefaultAppPath } from "@/lib/default-app-path"

export const dynamic = "force-dynamic"

export default async function ResetPasswordPage() {
  const user = await getCurrentUser()
  if (user) {
    redirect(getDefaultAppPath(user.role))
  }

  return <ResetPasswordPageClient />
}
