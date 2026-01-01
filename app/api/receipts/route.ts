import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { stripe } from "@/lib/stripe"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const session = await getSessionUser()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role !== "ORGANIZER") {
    return NextResponse.json({ error: "Only organizers can view receipts" }, { status: 403 })
  }

  const url = new URL(req.url)
  const fromRaw = url.searchParams.get("from")
  const toRaw = url.searchParams.get("to")

  const createdAt: { gte?: Date; lte?: Date } = {}

  if (fromRaw) {
    const from = new Date(fromRaw)
    if (!Number.isNaN(from.getTime())) {
      createdAt.gte = from
    }
  }

  if (toRaw) {
    const to = new Date(toRaw)
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999)
      createdAt.lte = to
    }
  }

  const where: any = {
    organizerId: session.sub,
  }

  if (createdAt.gte || createdAt.lte) {
    where.createdAt = createdAt
  }

  try {
    const boostReceiptClient = (prisma as any).boostReceipt
    if (!boostReceiptClient?.findMany) {
      return NextResponse.json(
        { error: "Receipts are not available on this server yet. Restart the dev server (and run prisma generate if needed)." },
        { status: 500 },
      )
    }

    const receipts = await boostReceiptClient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        level: true,
        amount: true,
        currency: true,
        boostUntil: true,
        eventTitle: true,
        eventId: true,
        boostCheckoutId: true,
        boostCheckout: {
          select: {
            stripeSessionIdHash: true,
          },
        },
      },
    })

    const withStripeReceipts = await Promise.all(
      (Array.isArray(receipts) ? receipts : []).map(async (r: any) => {
        const stripeSessionIdRaw =
          typeof r?.boostCheckout?.stripeSessionIdHash === "string" && r.boostCheckout.stripeSessionIdHash.startsWith("cs_")
            ? r.boostCheckout.stripeSessionIdHash
            : null

        if (!stripe || !stripeSessionIdRaw) {
          const { boostCheckout, ...rest } = r
          return { ...rest, receiptUrl: null, receiptPdfUrl: null }
        }

        try {
          const session = await stripe.checkout.sessions.retrieve(stripeSessionIdRaw, {
            expand: ["payment_intent.latest_charge"],
          })
          const pi = (session as any).payment_intent
          const charge = pi && typeof pi === "object" ? (pi as any).latest_charge : null
          const receiptUrl = charge && typeof charge === "object" ? ((charge as any).receipt_url as string | null) : null

          const invoiceId = typeof (session as any).invoice === "string" ? ((session as any).invoice as string) : null
          const invoice = invoiceId ? await stripe.invoices.retrieve(invoiceId) : null
          const receiptPdfUrl = invoice && typeof (invoice as any).invoice_pdf === "string" ? ((invoice as any).invoice_pdf as string) : null

          const { boostCheckout, ...rest } = r
          return {
            ...rest,
            receiptUrl: typeof receiptUrl === "string" ? receiptUrl : null,
            receiptPdfUrl: typeof receiptPdfUrl === "string" ? receiptPdfUrl : null,
          }
        } catch {
          const { boostCheckout, ...rest } = r
          return { ...rest, receiptUrl: null, receiptPdfUrl: null }
        }
      }),
    )

    return NextResponse.json({ receipts: withStripeReceipts })
  } catch (error) {
    console.error("GET /api/receipts error:", error)
    const message = error instanceof Error ? error.message : "Failed to fetch receipts"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
