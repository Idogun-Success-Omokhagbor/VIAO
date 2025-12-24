export interface Message {
  id: string
  content: string
  sender: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  recipient: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  timestamp: Date
  read: boolean
  type?: "text" | "image" | "voice"
  imageUrl?: string
  voiceUrl?: string
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
  participants: Array<{
    id: string
    name: string
    email: string
    avatar?: string
  }>
  messages: Message[]
  lastMessage?: Message
  unreadCount: number
  isGroup: boolean
  groupName?: string
  groupAvatar?: string
  createdAt: Date
  updatedAt: Date
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
  loading: boolean
  sendMessage: (
    receiverId: string,
    content: string,
    type?: "text" | "image" | "voice",
    imageUrl?: string,
    voiceUrl?: string,
  ) => Promise<void>
  markAsRead: (conversationId: string) => Promise<void>
  setActiveConversation: (conversation: Conversation | null) => void
  createConversation: (participantId: string) => Promise<Conversation>
  deleteConversation: (conversationId: string) => Promise<void>
  searchMessages: (query: string) => Promise<Message[]>
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
  email: string
  avatar?: string
  isOnline?: boolean
  lastSeen?: Date
}

export interface CreateMessageData {
  content: string
  receiverId: string
  type?: "text" | "image" | "voice"
  imageUrl?: string
  voiceUrl?: string
}
