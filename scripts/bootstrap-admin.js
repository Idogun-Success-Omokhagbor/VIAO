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

async function main() {
  const root = process.cwd()
  loadEnvFile(path.join(root, ".env"), { override: false })
  loadEnvFile(path.join(root, ".env.local"), { override: true })

  if (!process.env.DATABASE_URL) {
    console.warn("Admin bootstrap skipped: DATABASE_URL is not set")
    return
  }

  const adminEmail = (process.env.ADMIN_EMAIL || "idogunsuccessomokhagbor@outlook.com").toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD || "Omokhagbor.0"

  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL/ADMIN_PASSWORD are required")
  }

  const prisma = new PrismaClient()

  try {
    const existingAdmin = await prisma.user.findFirst({ where: { role: "ADMIN" } })
    if (existingAdmin) {
      return
    }

    const existingByEmail = await prisma.user.findUnique({ where: { email: adminEmail } })
    const passwordHash = await bcrypt.hash(adminPassword, 12)

    if (existingByEmail) {
      await prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          role: "ADMIN",
          passwordHash,
        },
        select: { id: true },
      })
      return
    }

    await prisma.user.create({
      data: {
        name: "Admin",
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
        interests: [],
      },
      select: { id: true },
    })
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}

main().catch((err) => {
  console.error("Admin bootstrap failed:", err)
  process.exit(1)
})
