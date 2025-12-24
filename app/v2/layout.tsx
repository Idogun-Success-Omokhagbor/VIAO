import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "../globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Viao V2 - Next Generation Event Discovery",
  description: "Experience the future of event discovery with Viao V2",
}

export default function V2Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">{children}</div>
      </body>
    </html>
  )
}
