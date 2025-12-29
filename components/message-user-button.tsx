"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import { MessagingModal } from "./messaging-modal"
import { useMessaging } from "@/context/messaging-context"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"

interface MessageUserButtonProps {
  userId: string
  userName: string
  userAvatar?: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
  className?: string
}

export function MessageUserButton({
  userId,
  userName,
  userAvatar,
  variant = "outline",
  size = "sm",
  className,
}: MessageUserButtonProps) {
  const { user } = useAuth()
  const { getOrCreateConversation, conversations } = useMessaging()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [conversation, setConversation] = useState(null)
  const [isRequesting, setIsRequesting] = useState(false)

  const existingConversation = useMemo(
    () => conversations.find((c) => c.participants.some((p) => p.id === userId)),
    [conversations, userId],
  )

  const statusLabel =
    existingConversation?.status === "PENDING"
      ? "Request sent"
      : existingConversation?.status === "DECLINED"
      ? "Request declined"
      : existingConversation?.status === "ACCEPTED"
      ? "Open chat"
      : "Request to PM"

  const handleMessageClick = async () => {
    if (!user || userId === user.id) return
    if (existingConversation?.status === "PENDING") {
      toast.info("Request already sent.")
      return
    }
    if (existingConversation?.status === "DECLINED") {
      toast.error("This request was declined.")
      return
    }

    try {
      setIsRequesting(true)
      const conv = existingConversation ?? (await getOrCreateConversation(userId))
      setConversation(conv)
      setIsModalOpen(true)
      if (!existingConversation && conv.status === "PENDING") {
        toast.success("Request sent. Waiting for acceptance.")
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to start conversation."
      toast.error(message)
    } finally {
      setIsRequesting(false)
    }
  }

  if (!user || userId === user.id) {
    return null
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleMessageClick}
        className={className}
        disabled={isRequesting || existingConversation?.status === "PENDING"}
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        {statusLabel}
      </Button>
     <MessagingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} conversation={conversation} />
    </>
  )
}

export default MessageUserButton
