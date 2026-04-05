import { redirect } from "next/navigation"

import { AuthPageClient } from "@/components/auth-page-client"
import { getCurrentUser } from "@/lib/current-user"

export const dynamic = "force-dynamic"

export default async function SignInPage() {
  const user = await getCurrentUser()
  if (user) {
    redirect("/dashboard")
  }

  return <AuthPageClient mode="signin" allowSignups={true} />
}
