export type ConversationStatus = "PENDING" | "ACCEPTED" | "DECLINED"

export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  timestamp: string
  readAt?: string | null
  type?: "text"
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
  messages?: Message[]
  lastMessage?: Message
  unreadCount: number
  status?: ConversationStatus
  requestedBy?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface ConversationParticipant {
  id: string
  name: string
  avatar?: string
  location?: string | null
  isOnline?: boolean
  lastSeen?: string | Date
}

export interface MessagingContextType {
  conversations: Conversation[]
  activeConversation: Conversation | null
  messages: Message[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  sendMessage: (conversationId: string, content: string) => Promise<void>
  markAsRead: (conversationId: string) => Promise<void>
  setActiveConversation: (conversation: Conversation | null) => void
  createConversation: (participantId: string) => Promise<Conversation>
  deleteConversation: (conversationId: string) => Promise<void>
  deleteConversations: (conversationIds: string[]) => Promise<void>
  clearConversationHistory: (conversationIds: string[]) => Promise<void>
  searchMessages: (query: string) => Promise<Message[]>
  getOrCreateConversation: (participantId: string) => Promise<Conversation>
  acceptConversation: (conversationId: string) => Promise<void>
  declineConversation: (conversationId: string) => Promise<void>
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
