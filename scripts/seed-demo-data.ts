import fs from "node:fs"
import path from "node:path"

import bcrypt from "bcryptjs"
import {
  ConversationStatus,
  EventReportStatus,
  MessageType,
  PostType,
  PrismaClient,
  Role,
  RsvpStatus,
} from "@prisma/client"

import { buildDemoEvents, buildDemoUsers, demoCommunityPosts, demoConversations } from "./demo-seed-catalog"

const prisma = new PrismaClient()
const DEMO_EMAIL_DOMAIN = "demo.viao.local"
const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD || "ViaoDemo123!"
const LEGACY_MOCK_ORGANIZER_EMAILS = [
  "viaoorg1@example.com",
  "viaoorg2@example.com",
  "viaoorg3@example.com",
  "viaoorg4@example.com",
  "viaotestpro@example.com",
] as const

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Zurich: { lat: 47.3769, lng: 8.5417 },
  Geneva: { lat: 46.2044, lng: 6.1432 },
  Basel: { lat: 47.5596, lng: 7.5886 },
  Bern: { lat: 46.948, lng: 7.4474 },
  Lausanne: { lat: 46.5197, lng: 6.6323 },
  Lucerne: { lat: 47.0502, lng: 8.3093 },
  "St. Gallen": { lat: 47.4245, lng: 9.3767 },
  Winterthur: { lat: 47.4988, lng: 8.7237 },
  Lugano: { lat: 46.0037, lng: 8.9511 },
  Fribourg: { lat: 46.8065, lng: 7.1619 },
  Chur: { lat: 46.8508, lng: 9.5329 },
  Zug: { lat: 47.1662, lng: 8.5155 },
  Aarau: { lat: 47.3925, lng: 8.0442 },
  Biel: { lat: 47.1368, lng: 7.2468 },
  Thun: { lat: 46.758, lng: 7.628 },
  Neuchatel: { lat: 46.9896, lng: 6.9293 },
}

function loadEnvFile(filePath: string, override: boolean) {
  if (!fs.existsSync(filePath)) return
  const raw = fs.readFileSync(filePath, "utf8")

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const separator = trimmed.indexOf("=")
    if (separator < 1) continue

    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    if (!override && process.env[key] !== undefined) continue
    process.env[key] = value
  }
}

function toDemoEmail(email: string) {
  const localPart = email.split("@")[0]?.replace(/[^a-z0-9.]+/gi, ".").replace(/\.+/g, ".").replace(/^\./, "").replace(/\.$/, "")
  return `${localPart || "demo-user"}@${DEMO_EMAIL_DOMAIN}`.toLowerCase()
}

function hashString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function createRng(seed: string) {
  let state = hashString(seed)
  const next = () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
  const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min
  const sample = <T>(items: readonly T[], count: number) => {
    const clone = [...items]
    for (let index = clone.length - 1; index > 0; index -= 1) {
      const swapIndex = int(0, index)
      ;[clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]]
    }
    return clone.slice(0, Math.min(count, clone.length))
  }

  return { next, int, sample }
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

function addDays(date: Date, days: number) {
  return addHours(date, days * 24)
}

function formatTimeLabel(startsAt: Date, endsAt: Date) {
  const options: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" }
  return `${startsAt.toLocaleTimeString("en-CH", options)} - ${endsAt.toLocaleTimeString("en-CH", options)}`
}

async function clearUserData(userIds: string[]) {
  if (userIds.length === 0) return

  const events = await prisma.event.findMany({ where: { organizerId: { in: userIds } }, select: { id: true } })
  const eventIds = events.map((event) => event.id)
  const posts = await prisma.communityPost.findMany({ where: { authorId: { in: userIds } }, select: { id: true } })
  const postIds = posts.map((post) => post.id)
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ requestedBy: { in: userIds } }, { participants: { some: { userId: { in: userIds } } } }],
    },
    select: { id: true },
  })
  const conversationIds = conversations.map((conversation) => conversation.id)

  await prisma.aiChatMessage.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.adminAuditLog.deleteMany({ where: { adminId: { in: userIds } } })
  await prisma.pushSubscription.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } })

  if (conversationIds.length > 0) {
    await prisma.message.deleteMany({ where: { conversationId: { in: conversationIds } } })
    await prisma.conversationParticipant.deleteMany({ where: { conversationId: { in: conversationIds } } })
    await prisma.conversation.deleteMany({ where: { id: { in: conversationIds } } })
  }
  await prisma.message.deleteMany({ where: { senderId: { in: userIds } } })
  await prisma.conversationParticipant.deleteMany({ where: { userId: { in: userIds } } })

  if (postIds.length > 0) {
    await prisma.comment.deleteMany({ where: { postId: { in: postIds } } })
    await prisma.communityPost.deleteMany({ where: { id: { in: postIds } } })
  }
  await prisma.comment.deleteMany({ where: { authorId: { in: userIds } } })

  if (eventIds.length > 0) {
    await prisma.eventSave.deleteMany({ where: { eventId: { in: eventIds } } })
    await prisma.rsvp.deleteMany({ where: { eventId: { in: eventIds } } })
    await prisma.eventReport.deleteMany({ where: { eventId: { in: eventIds } } })
    await prisma.boostReceipt.deleteMany({ where: { eventId: { in: eventIds } } })
    await prisma.boostCheckout.deleteMany({ where: { eventId: { in: eventIds } } })
    await prisma.event.deleteMany({ where: { id: { in: eventIds } } })
  }

  await prisma.eventSave.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.rsvp.deleteMany({ where: { userId: { in: userIds } } })
  await prisma.eventReport.deleteMany({ where: { reporterId: { in: userIds } } })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
}

async function clearExistingDemoData() {
  const demoUsers = await prisma.user.findMany({
    where: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } },
    select: { id: true },
  })

  await clearUserData(demoUsers.map((user) => user.id))
}

async function clearLegacyMockData() {
  const legacyUsers = await prisma.user.findMany({
    where: {
      email: {
        in: [...LEGACY_MOCK_ORGANIZER_EMAILS],
      },
    },
    select: { id: true },
  })

  await clearUserData(legacyUsers.map((user) => user.id))
}

async function main() {
  const root = process.cwd()
  loadEnvFile(path.join(root, ".env"), false)
  loadEnvFile(path.join(root, ".env.local"), true)

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to seed demo data")
  }

  await clearExistingDemoData()
  await clearLegacyMockData()

  const demoUsers = buildDemoUsers().map((user) => ({ ...user, email: toDemoEmail(user.email), password: DEMO_PASSWORD }))
  const demoEvents = buildDemoEvents().map((event) => ({ ...event, organizerEmail: toDemoEmail(event.organizerEmail) }))
  const communityPosts = demoCommunityPosts.map((post) => ({
    ...post,
    authorEmail: toDemoEmail(post.authorEmail),
    comments: post.comments.map((comment) => ({ ...comment, authorEmail: toDemoEmail(comment.authorEmail) })),
  }))
  const conversations = demoConversations.map((conversation) => ({
    ...conversation,
    requesterEmail: toDemoEmail(conversation.requesterEmail),
    participantEmail: toDemoEmail(conversation.participantEmail),
    messages: conversation.messages.map((message) => ({ ...message, senderEmail: toDemoEmail(message.senderEmail) })),
  }))

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)
  const users = new Map<string, { id: string; email: string; role: Role; name: string }>()

  for (const [index, user] of demoUsers.entries()) {
    const resolvedRole = user.role === "ADMIN" ? Role.ORGANIZER : (user.role as Role)
    const created = await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        role: resolvedRole,
        passwordHash,
        location: user.location,
        interests: user.interests,
        bio: user.bio,
        phone: user.phone,
        avatarUrl: user.avatarUrl ?? null,
        createdAt: addDays(new Date(), -(120 - index)),
        lastSeenAt: addHours(new Date(), -(index % 18)),
        preferences: {
          demoSeed: true,
          source: "realistic-demo",
          emailNotifications: true,
          pushNotifications: index % 4 !== 0,
          eventReminders: true,
          communityUpdates: index % 3 !== 0,
          messageNotifications: true,
          profileVisibility: index % 5 === 0 ? "private" : "public",
          showOnlineStatus: index % 6 !== 0,
          eventHistory: true,
        },
      },
      select: { id: true, email: true, role: true, name: true },
    })
    users.set(created.email, created)
  }

  const eventIds = new Map<string, string>()
  const publishedEvents: { id: string; organizerId: string; title: string; slug: string; boostLevel: number; category: string; city: string }[] = []

  for (const [index, event] of demoEvents.entries()) {
    const organizer = users.get(event.organizerEmail)
    if (!organizer) throw new Error(`Organizer ${event.organizerEmail} not found`)

    const startsAt = new Date(event.startsAt)
    const endsAt = new Date(event.endsAt)
    const created = await prisma.event.create({
      data: {
        organizerId: organizer.id,
        title: event.title,
        description: event.description,
        date: startsAt,
        startsAt,
        endsAt,
        timeLabel: formatTimeLabel(startsAt, endsAt),
        location: event.location,
        city: event.city,
        venue: event.venue,
        address: event.address,
        lat: CITY_COORDS[event.city]?.lat ?? null,
        lng: CITY_COORDS[event.city]?.lng ?? null,
        category: event.category,
        imageUrl: event.imageUrl,
        imageUrls: event.imageUrls,
        price: event.price,
        isBoosted: event.isBoosted,
        boostLevel: event.boostLevel,
        boostUntil: event.isBoosted ? addDays(new Date(), 7 + index) : null,
        maxAttendees: event.maxAttendees,
      },
      select: { id: true },
    })
    eventIds.set(event.slug, created.id)
    publishedEvents.push({
      id: created.id,
      organizerId: organizer.id,
      title: event.title,
      slug: event.slug,
      boostLevel: event.boostLevel,
      category: event.category,
      city: event.city,
    })

    if (event.boostLevel > 0) {
      const amount = event.boostLevel >= 2 ? 3000 : 1000
      const checkout = await prisma.boostCheckout.create({
        data: {
          stripeSessionIdHash: `demo_boost_${event.slug}`,
          level: event.boostLevel,
          amount,
          currency: "CHF",
          status: "COMPLETED",
          processedAt: addDays(new Date(), -(index + 1)),
          eventId: created.id,
          organizerId: organizer.id,
        },
        select: { id: true },
      })
      await prisma.boostReceipt.create({
        data: {
          level: event.boostLevel,
          amount,
          currency: "CHF",
          boostUntil: addDays(new Date(), 7 + index),
          eventTitle: event.title,
          eventId: created.id,
          organizerId: organizer.id,
          boostCheckoutId: checkout.id,
        },
      })
    }
  }

  const userPool = Array.from(users.values())
  const attendeePool = userPool.filter((user) => user.role !== Role.ADMIN)

  for (const [index, event] of publishedEvents.entries()) {
    const rng = createRng(`attendance:${event.slug}`)
    const attendees = rng.sample(attendeePool.filter((user) => user.id !== event.organizerId), 10 + (index % 11))

    for (const [attendeeIndex, attendee] of attendees.entries()) {
      await prisma.rsvp.create({
        data: {
          eventId: event.id,
          userId: attendee.id,
          status: attendeeIndex < Math.ceil(attendees.length * 0.8) ? RsvpStatus.GOING : RsvpStatus.MAYBE,
          createdAt: addDays(new Date(), -(attendeeIndex + 1)),
        },
      })
    }

    for (const saver of rng.sample(attendees, Math.max(4, Math.floor(attendees.length / 2)))) {
      await prisma.eventSave.create({
        data: {
          eventId: event.id,
          userId: saver.id,
          createdAt: addDays(new Date(), -rng.int(1, 9)),
        },
      })
    }
  }

  for (const [index, post] of communityPosts.entries()) {
    const author = users.get(post.authorEmail)
    if (!author) continue
    const rng = createRng(`post:${post.title}`)
    const likedBy = rng.sample(userPool.filter((user) => user.id !== author.id).map((user) => user.id), 6 + (index % 6))
    const views = rng.sample(userPool.map((user) => user.id), 12 + (index % 10))
    const created = await prisma.communityPost.create({
      data: {
        authorId: author.id,
        title: post.title,
        content: post.content,
        type: post.type as PostType,
        tags: post.tags,
        location: post.location,
        imageUrl: post.imageUrl ?? null,
        mediaType: post.mediaType ?? null,
        category: post.category,
        likes: likedBy.length,
        likedBy,
        views,
        createdAt: addDays(new Date(), -(index + 2)),
      },
      select: { id: true },
    })

    for (const [commentIndex, comment] of post.comments.entries()) {
      const commenter = users.get(comment.authorEmail)
      if (!commenter) continue
      await prisma.comment.create({
        data: {
          postId: created.id,
          authorId: commenter.id,
          content: comment.content,
          createdAt: addHours(addDays(new Date(), -(index + 1)), commentIndex + 1),
        },
      })
    }
  }

  for (const [index, event] of publishedEvents.slice(0, 6).entries()) {
    const author = attendeePool[(index * 2 + 3) % attendeePool.length]
    const rng = createRng(`extra-post:${event.slug}`)
    const likedBy = rng.sample(userPool.filter((user) => user.id !== author.id).map((user) => user.id), 5 + index)
    const views = rng.sample(userPool.map((user) => user.id), 10 + index * 2)
    const createdPost = await prisma.communityPost.create({
      data: {
        authorId: author.id,
        title: `Heading to ${event.title}`,
        content:
          "This is exactly the kind of local event I like seeing on Viao: clear details, a focused crowd, and enough information to decide quickly.",
        type: PostType.EVENT,
        tags: [event.city, event.category, "community"],
        location: `${event.city}, Switzerland`,
        category: event.category,
        imageUrl: null,
        mediaType: null,
        likes: likedBy.length,
        likedBy,
        views,
        createdAt: addDays(new Date(), -(index + 4)),
      },
      select: { id: true },
    })

    const comments = rng.sample(userPool.filter((user) => user.id !== author.id), 2 + (index % 2))
    for (const [commentIndex, commenter] of comments.entries()) {
      await prisma.comment.create({
        data: {
          postId: createdPost.id,
          authorId: commenter.id,
          content: ["Looks strong.", "I saved this one too.", "Good choice.", "The venue alone sold me on it."][commentIndex]!,
          createdAt: addHours(addDays(new Date(), -(index + 3)), commentIndex + 1),
        },
      })
    }
  }

  for (const [index, event] of publishedEvents.slice(0, 8).entries()) {
    const organizer = userPool.find((user) => user.id === event.organizerId)
    const attendee = attendeePool.filter((user) => user.id !== event.organizerId)[index % attendeePool.filter((user) => user.id !== event.organizerId).length]
    if (!attendee || !organizer) continue

    const conversation = await prisma.conversation.create({
      data: {
        status: ConversationStatus.ACCEPTED,
        requestedBy: attendee.id,
        participants: { create: [{ userId: attendee.id }, { userId: organizer.id }] },
      },
      select: { id: true },
    })

    const baseTime = addDays(new Date(), -(index + 3))
    const messages = [
      { senderId: attendee.id, content: `Hi, I’m thinking about joining ${event.title}. Does it work well if I come solo?` },
      { senderId: organizer.id, content: "Yes, absolutely. The room is designed to be easy to join alone." },
      { senderId: attendee.id, content: "Perfect. That is exactly what I was hoping for." },
      { senderId: organizer.id, content: "Come a little early and we’ll make the arrival feel smooth." },
    ]

    for (const [messageIndex, message] of messages.entries()) {
      const createdAt = addHours(baseTime, messageIndex)
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: message.senderId,
          content: message.content,
          type: MessageType.TEXT,
          deliveredAt: createdAt,
          readAt: addHours(createdAt, 1),
          createdAt,
        },
      })
    }
  }

  for (const conversation of conversations) {
    const requester = users.get(conversation.requesterEmail)
    const participant = users.get(conversation.participantEmail)
    if (!requester || !participant) continue

    const createdConversation = await prisma.conversation.create({
      data: {
        status: conversation.status as ConversationStatus,
        requestedBy: requester.id,
        participants: { create: [{ userId: requester.id }, { userId: participant.id }] },
      },
      select: { id: true },
    })

    for (const message of conversation.messages) {
      const sender = users.get(message.senderEmail)
      if (!sender) continue
      const createdAt = new Date(message.createdAt)
      await prisma.message.create({
        data: {
          conversationId: createdConversation.id,
          senderId: sender.id,
          content: message.content,
          type: MessageType.TEXT,
          deliveredAt: createdAt,
          readAt: conversation.status === "ACCEPTED" ? addHours(createdAt, 1) : null,
          createdAt,
        },
      })
    }
  }

  for (const [index, event] of publishedEvents.slice(0, 4).entries()) {
    const reporter = attendeePool[(index * 3 + 1) % attendeePool.length]
    await prisma.eventReport.create({
      data: {
        reporterId: reporter.id,
        eventId: event.id,
        reason: ["Pricing details", "Schedule clarity", "Venue access", "Description wording"][index]!,
        details: [
          "Guests may want a clearer note on what is included in the entry price.",
          "The description could make the timing breakdown more explicit.",
          "Adding one line about accessibility would help.",
          "The core event details are right, but one section could be tighter.",
        ][index]!,
        status: [EventReportStatus.OPEN, EventReportStatus.REVIEWED, EventReportStatus.OPEN, EventReportStatus.DISMISSED][index]!,
        createdAt: addDays(new Date(), -(index + 2)),
      },
    })
  }

  for (const [index, user] of userPool.slice(0, 18).entries()) {
    const sessionCount = index % 3 === 0 ? 2 : 1
    for (let sessionIndex = 0; sessionIndex < sessionCount; sessionIndex += 1) {
      const createdAt = addDays(new Date(), -(index + sessionIndex + 1))
      await prisma.session.create({
        data: {
          userId: user.id,
          userAgent:
            sessionIndex === 0
              ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/135.0 Safari/537.36"
              : "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
          ip: `192.168.10.${20 + index + sessionIndex}`,
          lastSeenAt: addHours(new Date(), -(index + sessionIndex)),
          expiresAt: addDays(new Date(), 14 - sessionIndex),
          createdAt,
        },
      })
    }
  }

  const [userCount, eventCount, rsvpCount, saveCount, postCount, commentCount, conversationCount, messageCount] = await Promise.all([
    prisma.user.count(),
    prisma.event.count(),
    prisma.rsvp.count(),
    prisma.eventSave.count(),
    prisma.communityPost.count(),
    prisma.comment.count(),
    prisma.conversation.count(),
    prisma.message.count(),
  ])

  console.log(
    JSON.stringify(
      {
        demoPassword: DEMO_PASSWORD,
        sampleLogins: demoUsers.slice(0, 6).map((user) => user.email),
        counts: {
          users: userCount,
          events: eventCount,
          rsvps: rsvpCount,
          saves: saveCount,
          posts: postCount,
          comments: commentCount,
          conversations: conversationCount,
          messages: messageCount,
        },
      },
      null,
      2,
    ),
  )
}

main()
  .catch(async (error) => {
    console.error("Demo seed failed:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {})
  })
