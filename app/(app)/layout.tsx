"use client"

import type React from "react"

import { AuthProvider } from "@/context/auth-context"
import { EventsProvider } from "@/context/events-context"
import { CommunityProvider } from "@/context/community-context"
import { MessagingProvider } from "@/context/messaging-context"
import Header from "@/components/header"
import CenterDock from "@/components/center-dock"
import FloatingButton from "@/components/floating-button"
import AuthModal from "@/components/auth-modal"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <EventsProvider>
        <CommunityProvider>
          <MessagingProvider>
            <div className="min-h-screen bg-gray-50">
              <Header />
              <main className="pb-24">{children}</main>
              <CenterDock />
              <FloatingButton />
              <AuthModal />
            </div>
          </MessagingProvider>
        </CommunityProvider>
      </EventsProvider>
    </AuthProvider>
  )
}
