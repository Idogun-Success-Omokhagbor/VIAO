"use client"

import { useState } from "react"
import { Bookmark, CheckCircle2, EyeOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { useEvents } from "@/context/events-context"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { Event } from "@/types/event"

type EventQuickActionsProps = {
  event: Event
  compact?: boolean
  className?: string
  onDismiss?: (eventId: string) => void
  dismissLabel?: string
}

export default function EventQuickActions({
  event,
  compact = false,
  className,
  onDismiss,
  dismissLabel = "Not now",
}: EventQuickActionsProps) {
  const { user, openAuthPage } = useAuth()
  const { saveEvent, unsaveEvent, rsvpEvent, cancelRsvp } = useEvents()
  const { toast } = useToast()
  const [pendingAction, setPendingAction] = useState<"save" | "rsvp" | null>(null)

  const isGoing = event.rsvpStatus === "GOING"
  const isSaved = Boolean(event.isSaved)
  const canDismiss = Boolean(onDismiss) && !isSaved && !isGoing && event.rsvpStatus !== "MAYBE"

  async function handleSave(eventId: string) {
    if (!user) {
      openAuthPage("signup")
      return
    }

    setPendingAction("save")
    try {
      if (isSaved) {
        await unsaveEvent(eventId)
        toast({ title: "Removed from My events", description: "You can still find it again in Discover." })
      } else {
        await saveEvent(eventId)
        toast({ title: "Saved to My events", description: "Viao will keep this plan close." })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update this event"
      toast({ title: "Save failed", description: message })
    } finally {
      setPendingAction(null)
    }
  }

  async function handleRsvp(eventId: string) {
    if (!user) {
      openAuthPage("signup")
      return
    }

    setPendingAction("rsvp")
    try {
      if (isGoing) {
        await cancelRsvp(eventId)
        toast({ title: "RSVP removed", description: "This event is no longer in your active plans." })
      } else {
        await rsvpEvent(eventId)
        toast({ title: "You are going", description: "This event is now in your plans." })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update your RSVP"
      toast({ title: "RSVP failed", description: message })
    } finally {
      setPendingAction(null)
    }
  }

  const buttonClassName = compact
    ? "h-9 rounded-full px-3 text-xs font-semibold"
    : "h-10 rounded-full px-4 text-sm font-semibold"

  function handleDismiss() {
    if (!onDismiss) return
    onDismiss(event.id)
    toast({
      title: "Hidden for now",
      description: "Viao will move this out of the way on Home and Discover.",
    })
  }

  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pendingAction !== null}
        onClick={() => void handleSave(event.id)}
        className={cn(
          buttonClassName,
          isSaved
            ? "border-[#cdbdff] bg-[#f6f1ff] text-[#4f33d8] hover:bg-[#efe7ff]"
            : "border-[#ddd1ff] bg-white text-[#5e4ea6] hover:bg-[#f6f1ff]",
        )}
      >
        {pendingAction === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />}
        {isSaved ? "Saved" : "Save"}
      </Button>

      <Button
        type="button"
        size="sm"
        disabled={pendingAction !== null}
        onClick={() => void handleRsvp(event.id)}
        className={cn(
          buttonClassName,
          isGoing
            ? "bg-[#1f8f55] text-white hover:bg-[#187547]"
            : "bg-[#7c5cff] text-white shadow-[0_12px_24px_rgba(124,92,255,0.18)] hover:bg-[#6c4ef7]",
        )}
      >
        {pendingAction === "rsvp" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {isGoing ? "Going" : "RSVP"}
      </Button>

      {canDismiss ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pendingAction !== null}
          onClick={handleDismiss}
          className={cn(
            buttonClassName,
            "border border-transparent bg-[#f8f5ff] text-[#7a709f] hover:bg-[#efe7ff] hover:text-[#4f33d8]",
          )}
        >
          <EyeOff className="h-4 w-4" />
          {dismissLabel}
        </Button>
      ) : null}
    </div>
  )
}
