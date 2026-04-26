import { redirect } from "next/navigation"

import { getCurrentUser } from "@/lib/current-user"
import { getDefaultAppPath } from "@/lib/default-app-path"

export default async function DashboardRedirectPage() {
  const user = await getCurrentUser()
  redirect(getDefaultAppPath(user?.role))
}
