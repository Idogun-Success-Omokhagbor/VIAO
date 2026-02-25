const fs = require("fs")
const path = require("path")
const bcrypt = require("bcryptjs")
const { PrismaClient } = require("@prisma/client")

function loadEnvFile(filePath, { override }) {
  if (!fs.existsSync(filePath)) return
  const raw = fs.readFileSync(filePath, "utf8")
  const lines = raw.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx === -1) continue

    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    if (!override && process.env[key] !== undefined) continue
    process.env[key] = value
  }
}

async function upsertReviewUser(prisma, account) {
  const passwordHash = await bcrypt.hash(account.password, 12)
  const existing = await prisma.user.findUnique({
    where: { email: account.email },
    select: { id: true },
  })

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name: account.name,
        role: account.role,
        passwordHash,
      },
      select: { id: true, email: true, role: true, name: true },
    })
  }

  return prisma.user.create({
    data: {
      name: account.name,
      email: account.email,
      role: account.role,
      passwordHash,
      interests: [],
    },
    select: { id: true, email: true, role: true, name: true },
  })
}

async function ensureOrganizerData(prisma, organizerId, reviewUserId) {
  const now = new Date()
  const start = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  const draftStart = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000)

  let upcomingEvent = await prisma.event.findFirst({
    where: {
      organizerId,
      status: "PUBLISHED",
      isCancelled: false,
      startsAt: { gte: now },
    },
    select: { id: true, startsAt: true },
    orderBy: { startsAt: "asc" },
  })

  if (!upcomingEvent) {
    upcomingEvent = await prisma.event.create({
      data: {
        organizerId,
        title: "App Review Demo Event",
        description: "Demo event for Apple App Review to verify RSVP, messaging, and calendar flows.",
        date: start,
        startsAt: start,
        endsAt: end,
        timeLabel: "6:00 PM - 8:00 PM",
        location: "Zurich, Switzerland",
        city: "Zurich",
        venue: "Viao Demo Hall",
        address: "Bahnhofstrasse 1",
        category: "Technology",
        price: 0,
        maxAttendees: 100,
        status: "PUBLISHED",
      },
      select: { id: true, startsAt: true },
    })
  }

  const existingDraft = await prisma.event.findFirst({
    where: {
      organizerId,
      status: "DRAFT",
      isCancelled: false,
    },
    select: { id: true },
  })

  if (!existingDraft) {
    await prisma.event.create({
      data: {
        organizerId,
        title: "App Review Draft Event",
        description: "Draft event to verify organizer management workflows.",
        date: draftStart,
        startsAt: draftStart,
        endsAt: new Date(draftStart.getTime() + 60 * 60 * 1000),
        timeLabel: "7:00 PM - 8:00 PM",
        location: "Geneva, Switzerland",
        city: "Geneva",
        venue: "Draft Workspace",
        address: "Rue du Rhone 10",
        category: "Business",
        price: 0,
        status: "DRAFT",
      },
      select: { id: true },
    })
  }

  await prisma.rsvp.upsert({
    where: {
      userId_eventId: {
        userId: reviewUserId,
        eventId: upcomingEvent.id,
      },
    },
    update: { status: "GOING" },
    create: {
      userId: reviewUserId,
      eventId: upcomingEvent.id,
      status: "GOING",
    },
  })
}

async function main() {
  const root = process.cwd()
  loadEnvFile(path.join(root, ".env"), { override: false })
  loadEnvFile(path.join(root, ".env.local"), { override: true })

  if (!process.env.DATABASE_URL) {
    console.warn("Review bootstrap skipped: DATABASE_URL is not set")
    return
  }

  const defaultPassword = process.env.REVIEW_PASSWORD || "AppReview123!"
  const accounts = [
    {
      name: "App Review User",
      role: "USER",
      email: (process.env.REVIEW_USER_EMAIL || "appreview.user@viao.app").toLowerCase(),
      password: process.env.REVIEW_USER_PASSWORD || defaultPassword,
    },
    {
      name: "App Review Organizer",
      role: "ORGANIZER",
      email: (process.env.REVIEW_ORGANIZER_EMAIL || "appreview.organizer@viao.app").toLowerCase(),
      password: process.env.REVIEW_ORGANIZER_PASSWORD || defaultPassword,
    },
  ]

  const prisma = new PrismaClient()

  try {
    const [reviewUser, reviewOrganizer] = await Promise.all([
      upsertReviewUser(prisma, accounts[0]),
      upsertReviewUser(prisma, accounts[1]),
    ])

    await ensureOrganizerData(prisma, reviewOrganizer.id, reviewUser.id)

    console.log("Review accounts are ready:")
    console.log(`- USER: ${accounts[0].email} / ${accounts[0].password}`)
    console.log(`- ORGANIZER: ${accounts[1].email} / ${accounts[1].password}`)
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}

main().catch((error) => {
  console.error("Review bootstrap failed:", error)
  process.exit(1)
})

