import { redirect } from "next/navigation"

import { AuthPageClient } from "@/components/auth-page-client"
import { getCurrentUser } from "@/lib/current-user"
import { getDefaultAppPath } from "@/lib/default-app-path"
import { getSiteConfig } from "@/lib/site-config"

export const dynamic = "force-dynamic"

export default async function SignUpPage() {
  const user = await getCurrentUser()
  if (user) {
    redirect(getDefaultAppPath(user.role))
  }

  const siteConfig = await getSiteConfig()

  return <AuthPageClient mode="signup" allowSignups={siteConfig.allowSignups} />
}
