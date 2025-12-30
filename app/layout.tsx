import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/context/auth-context"
import { EventsProvider } from "@/context/events-context"
import { CommunityProvider } from "@/context/community-context"
import { MessagingProvider } from "@/context/messaging-context"
import { NotificationProvider } from "@/context/notification-context"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Viao - Discover Local Events & Connect",
  description: "Find amazing local events, connect with your community, and discover new experiences near you.",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <EventsProvider>
              <CommunityProvider>
                <MessagingProvider>
                  <NotificationProvider>
                    {children}
                    <Toaster />
                  </NotificationProvider>
                </MessagingProvider>
              </CommunityProvider>
            </EventsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
