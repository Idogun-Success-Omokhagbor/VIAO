"use server"

import { prisma } from "@/lib/prisma"
import type { NotificationType } from "@prisma/client"

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  body?: string
  data?: Record<string, unknown>
}

export async function createNotification({ userId, type, title, body, data }: CreateNotificationParams) {
  if (!userId) return
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data ? (data as any) : undefined,
      },
    })
  } catch (error) {
    console.error("createNotification error:", error)
  }
}
