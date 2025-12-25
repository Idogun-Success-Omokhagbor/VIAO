export interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  timestamp: Date
  type?: "text" | "image" | "voice"
  attachmentUrl?: string
  isRead?: boolean
  isDelivered?: boolean
}

export interface MessageAttachment {
  id: string
  type: "image" | "file" | "voice"
  url: string
  name: string
  size: number
}

export interface Conversation {
  id: string
  participants: ConversationParticipant[]
  messages: Message[]
  lastMessage?: Message
  unreadCount: number
  createdAt?: Date
  updatedAt?: Date
}

export interface ConversationParticipant {
  id: string
  name: string
  avatar?: string
  isOnline: boolean
  lastSeen?: Date
}

export interface MessagingContextType {
  conversations: Conversation[]
  activeConversation: Conversation | null
  messages: Message[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  sendMessage: (
    conversationId: string,
    content: string,
  ) => Promise<void>
  markAsRead: (conversationId: string) => Promise<void>
  setActiveConversation: (conversation: Conversation | null) => void
  createConversation: (participantId: string) => Promise<Conversation>
  deleteConversation: (conversationId: string) => Promise<void>
  searchMessages: (query: string) => Promise<Message[]>
  getOrCreateConversation: (participantId: string) => Promise<Conversation>
}

export interface TypingIndicator {
  userId: string
  conversationId: string
  isTyping: boolean
}

export interface MessageReaction {
  id: string
  messageId: string
  userId: string
  emoji: string
  createdAt: Date
}

export interface VoiceMessage {
  id: string
  url: string
  duration: number
  waveform: number[]
}

export interface User {
  id: string
  name: string
  avatar?: string
  isOnline: boolean
  lastSeen?: Date
}

export interface CreateMessageData {
  content: string
  receiverId: string
  type?: "text" | "image" | "voice"
  attachmentUrl?: string
}
