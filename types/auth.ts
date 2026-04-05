export interface UserPreferences {
  emailNotifications?: boolean
  pushNotifications?: boolean
  eventReminders?: boolean
  communityUpdates?: boolean
  messageNotifications?: boolean
  profileVisibility?: boolean
  showOnlineStatus?: boolean
  eventHistory?: boolean
  adminSettings?: Record<string, unknown>
  [key: string]: unknown
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: "USER" | "ORGANIZER" | "ADMIN"
  interests?: string[]
  avatarUrl?: string
  avatar?: string
  createdAt?: string
  location?: string
  phone?: string
  bio?: string
  preferences?: UserPreferences
}
