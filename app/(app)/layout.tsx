"use client"

import type React from "react"

import Header from "@/components/header"
import CenterDock from "@/components/center-dock"
import FloatingButton from "@/components/floating-button"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pb-24">{children}</main>
      <CenterDock />
      <FloatingButton />
    </div>
  )
}
