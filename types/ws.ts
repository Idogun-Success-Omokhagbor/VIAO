export type ServerEvent =
  | {
      type: "message:new"
      message: {
        id: string
        conversationId: string
        senderId: string
        content: string
        timestamp: string
        readAt?: string | null
        deliveredAt?: string | null
        type?: string
      }
    }
