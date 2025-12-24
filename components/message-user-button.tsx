"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MessageCircle } from "lucide-react"
import { MessagingModal } from "./messaging-modal"
import { useMessaging } from "@/context/messaging-context"
import { useAuth } from "@/context/auth-context"

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
  const { getOrCreateConversation } = useMessaging()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [conversation, setConversation] = useState(null)

  const handleMessageClick = async () => {
    if (!user || userId === user.id) return

    const conv = await getOrCreateConversation(userId)
    setConversation(conv)
    setIsModalOpen(true)
  }

  if (!user || userId === user.id) {
    return null
  }

  return (
    <>
      <Button variant={variant} size={size} onClick={handleMessageClick} className={className}>
        <MessageCircle className="w-4 h-4 mr-2" />
        Message
      </Button>
      <MessagingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} conversation={conversation} />
    </>
  )
}

export default MessageUserButton
