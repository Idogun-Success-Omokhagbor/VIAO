import type React from "react"
import { redirect } from "next/navigation"
import { getDefaultAppPath } from "@/lib/default-app-path"
import { getSessionUser } from "@/lib/session"
import { AdminShell } from "./shell"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser()

  if (!session) {
    redirect("/")
  }

  if (session.role !== "ADMIN") {
    redirect(getDefaultAppPath(session.role))
  }

  return <AdminShell>{children}</AdminShell>
}
