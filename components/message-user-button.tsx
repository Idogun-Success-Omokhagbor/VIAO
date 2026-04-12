"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import { useMessaging } from "@/context/messaging-context"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import type { MessagingModalProps } from "./messaging-modal"
import type { Conversation } from "@/types/messaging"

const MessagingModal = dynamic<MessagingModalProps>(() => import("./messaging-modal").then((mod) => mod.MessagingModal), { ssr: false })

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
  userName: _userName,
  userAvatar: _userAvatar,
  variant = "outline",
  size = "sm",
  className,
}: MessageUserButtonProps) {
  const { user } = useAuth()
  const { getOrCreateConversation, conversations } = useMessaging()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [conversation, setConversation] = useState<Conversation | null>(null)
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
      : "Send message"

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
      {isModalOpen && conversation ? (
        <MessagingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} conversation={conversation} />
      ) : null}
    </>
  )
}

export default MessageUserButton
