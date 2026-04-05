import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { AntdRegistry } from "@ant-design/nextjs-registry"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/context/auth-context"
import { MessagingProvider } from "@/context/messaging-context"
import { NotificationProvider } from "@/context/notification-context"
import { getCurrentUser } from "@/lib/current-user"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Viao - Discover Local Events & Connect",
  description: "Find amazing local events, connect with your community, and discover new experiences near you.",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const initialUser = await getCurrentUser()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AntdRegistry>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <AuthProvider initialUser={initialUser}>
              <MessagingProvider>
                <NotificationProvider>
                  {children}
                  <Toaster />
                </NotificationProvider>
              </MessagingProvider>
            </AuthProvider>
          </ThemeProvider>
        </AntdRegistry>
      </body>
    </html>
  )
}
