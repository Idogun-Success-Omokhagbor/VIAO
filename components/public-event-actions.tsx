"use client"

import Link from "next/link"
import { ArrowRight, LogIn, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"

type PublicEventActionsProps = {
  eventId: string
  eventTitle: string
  eventDescription: string
}

async function shareEvent(eventTitle: string, eventDescription: string, eventUrl: string) {
  const fallbackCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(eventUrl)
        return
      }
    } catch {
      // clipboard can fail in some browsers
    }

    window.prompt("Copy this link", eventUrl)
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: eventTitle,
        text: eventDescription,
        url: eventUrl,
      })
      return
    } catch {
      // fall through to clipboard fallback
    }
  }

  await fallbackCopy()
}

export function PublicEventActions({ eventId, eventTitle, eventDescription }: PublicEventActionsProps) {
  const { user, openAuthPage } = useAuth()
  const publicEventHref = `/event/${eventId}`
  const appEventHref = `/events/${eventId}`

  const handleShare = async () => {
    const eventUrl = `${window.location.origin}${publicEventHref}`
    await shareEvent(eventTitle, eventDescription, eventUrl)
  }

  return (
    <>
      <div className="hidden space-y-4 lg:block">
        {user ? (
          <>
            <Button asChild className="h-11 w-full rounded-full bg-[#7c5cff] text-white hover:bg-[#6948ff]">
              <Link href={appEventHref}>
                Open in the app
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleShare()}
              className="h-11 w-full rounded-full border-[#ddd1ff] text-[#5e4ea6] hover:bg-[#f6f1ff]"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share event
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              onClick={() => openAuthPage("signup")}
              className="h-11 w-full rounded-full bg-[#7c5cff] text-white hover:bg-[#6948ff]"
            >
              Create account to RSVP
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => openAuthPage("login")}
              className="h-11 w-full rounded-full border-[#ddd1ff] text-[#5e4ea6] hover:bg-[#f6f1ff]"
            >
              <LogIn className="mr-2 h-4 w-4" />
              I already have an account
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void handleShare()}
              className="h-10 w-full rounded-full text-[#5e4ea6] hover:bg-[#f6f1ff]"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share event
            </Button>
          </>
        )}
      </div>

      <div className="fixed inset-x-4 bottom-4 z-40 rounded-[28px] border border-[#e7dcff] bg-white/96 p-3 shadow-[0_24px_70px_rgba(101,73,214,0.18)] backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleShare()}
            className="h-12 min-w-12 rounded-full border-[#ddd1ff] px-4 text-[#5e4ea6] hover:bg-[#f6f1ff]"
          >
            <Share2 className="h-4 w-4" />
          </Button>

          {user ? (
            <Button asChild className="h-12 flex-1 rounded-full bg-[#7c5cff] text-white hover:bg-[#6948ff]">
              <Link href={appEventHref}>
                Open in the app
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button
                type="button"
                onClick={() => openAuthPage("signup")}
                className="h-12 flex-1 rounded-full bg-[#7c5cff] text-white hover:bg-[#6948ff]"
              >
                Create account
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => openAuthPage("login")}
                className="h-12 rounded-full border-[#ddd1ff] px-4 text-[#5e4ea6] hover:bg-[#f6f1ff]"
              >
                <LogIn className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
