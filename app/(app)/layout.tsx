"use client"

import type React from "react"

import Header from "@/components/header"
import FloatingButton from "@/components/floating-button"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
      <FloatingButton />
    </div>
  )
}
