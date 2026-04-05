import { redirect } from "next/navigation"

import { AuthPageClient } from "@/components/auth-page-client"
import { getCurrentUser } from "@/lib/current-user"
import { getSiteConfig } from "@/lib/site-config"

export const dynamic = "force-dynamic"

export default async function SignUpPage() {
  const user = await getCurrentUser()
  if (user) {
    redirect("/dashboard")
  }

  const siteConfig = await getSiteConfig()

  return <AuthPageClient mode="signup" allowSignups={siteConfig.allowSignups} />
}
