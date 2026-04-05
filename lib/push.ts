import webpush from "web-push"

import { prisma } from "@/lib/prisma"

type PushPayload = {
  title: string
  body?: string
  url?: string
}

type StoredPushSubscription = {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  expirationTime: Date | null
}

type PushSendSubscription = Parameters<typeof webpush.sendNotification>[0]
type WebPushErrorWithStatus = Error & { statusCode?: number }

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com"

  if (!publicKey || !privateKey) {
    return null
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)

  return { publicKey }
}

export function getVapidPublicKey(): string | null {
  const cfg = getVapidConfig()
  return cfg?.publicKey ?? null
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const cfg = getVapidConfig()
  if (!cfg) return

  const subs: StoredPushSubscription[] = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true, expirationTime: true },
  })

  if (!subs.length) return

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
  })

  await Promise.all(
    subs.map(async (s: StoredPushSubscription) => {
      try {
        const subscription: PushSendSubscription = {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
          expirationTime: s.expirationTime ? s.expirationTime.getTime() : undefined,
        }

        await webpush.sendNotification(
          subscription,
          message,
        )
      } catch (err) {
        const error = err as WebPushErrorWithStatus
        const statusCode = error.statusCode
        if (statusCode === 404 || statusCode === 410) {
          try {
            await prisma.pushSubscription.delete({ where: { id: s.id } })
          } catch {
            // ignore
          }
        }
      }
    }),
  )
}
