"use server"

import { prisma } from "@/lib/prisma"
import { Prisma, type NotificationType } from "@prisma/client"
import { isUserConnected } from "@/lib/ws-server"
import { sendPushToUser } from "@/lib/push"

type NotificationChannel = "IN_APP" | "EMAIL" | "PUSH"

type UserNotificationPreferences = {
  messageNotifications?: boolean
  communityUpdates?: boolean
  emailNotifications?: boolean
  pushNotifications?: boolean
  [key: string]: unknown
}

const DEFAULT_PREFS: Required<Pick<UserNotificationPreferences, "messageNotifications" | "communityUpdates">> = {
  messageNotifications: true,
  communityUpdates: true,
}

function normalizePrefs(raw: unknown): UserNotificationPreferences {
  if (!raw || typeof raw !== "object") return {}
  return raw as UserNotificationPreferences
}

function getNotificationUrl(data: Record<string, unknown> | undefined): string | undefined {
  return typeof data?.url === "string" ? data.url : undefined
}

function isEnabledForChannel(prefs: UserNotificationPreferences, channel: NotificationChannel): boolean {
  // Only IN_APP exists today. Keep this switch so we can add EMAIL/PUSH later without refactoring core logic.
  if (channel === "EMAIL") return prefs.emailNotifications === true
  if (channel === "PUSH") return prefs.pushNotifications === true
  return true
}

function isEnabledForType(prefs: UserNotificationPreferences, type: NotificationType): boolean {
  const resolved = {
    ...DEFAULT_PREFS,
    ...prefs,
  }

  switch (type) {
    case "MESSAGE":
      return resolved.messageNotifications
    case "LIKE":
    case "COMMENT":
    case "REPLY":
      return resolved.communityUpdates
    default:
      return true
  }
}

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  body?: string
  data?: Record<string, unknown>
  channel?: NotificationChannel
  url?: string
}

export async function createNotification({ userId, type, title, body, data, channel = "IN_APP" }: CreateNotificationParams) {
  if (!userId) return
  try {
    const recipient = await prisma.user.findUnique({ where: { id: userId }, select: { preferences: true } })
    const prefs = normalizePrefs(recipient?.preferences)
    if (!isEnabledForType(prefs, type)) return

    if (channel === "EMAIL") {
      if (!isEnabledForChannel(prefs, channel)) return
      return
    }

    if (channel === "PUSH") {
      if (isEnabledForChannel(prefs, channel) && !isUserConnected(userId)) {
        await sendPushToUser(userId, {
          title,
          body,
          url: getNotificationUrl(data),
        })
      }
    }

    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: (data ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    })
  } catch (error) {
    console.error("createNotification error:", error)
  }
}
