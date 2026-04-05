import { Prisma } from "@prisma/client"
import type Stripe from "stripe"
import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"
import { stripe } from "@/lib/stripe"

export const runtime = "nodejs"

function isExpandedPaymentIntent(value: string | Stripe.PaymentIntent | null): value is Stripe.PaymentIntent {
  return !!value && typeof value !== "string"
}

function isExpandedCharge(value: string | Stripe.Charge | null | undefined): value is Stripe.Charge {
  return !!value && typeof value !== "string"
}

function isExpandedInvoice(value: string | Stripe.Invoice | null): value is Stripe.Invoice {
  return !!value && typeof value !== "string"
}

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

  const where: Prisma.BoostReceiptWhereInput = {
    organizerId: session.sub,
  }

  if (createdAt.gte || createdAt.lte) {
    where.createdAt = createdAt
  }

  try {
    const receipts = await prisma.boostReceipt.findMany({
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
      receipts.map(async (receipt) => {
        const stripeSessionIdRaw =
          typeof receipt.boostCheckout.stripeSessionIdHash === "string" && receipt.boostCheckout.stripeSessionIdHash.startsWith("cs_")
            ? receipt.boostCheckout.stripeSessionIdHash
            : null

        if (!stripe || !stripeSessionIdRaw) {
          const { boostCheckout, ...rest } = receipt
          return { ...rest, receiptUrl: null, receiptPdfUrl: null }
        }

        try {
          const checkoutSession = await stripe.checkout.sessions.retrieve(stripeSessionIdRaw, {
            expand: ["payment_intent.latest_charge"],
          })
          const paymentIntent = isExpandedPaymentIntent(checkoutSession.payment_intent) ? checkoutSession.payment_intent : null
          const charge = isExpandedCharge(paymentIntent?.latest_charge) ? paymentIntent.latest_charge : null
          const receiptUrl = charge?.receipt_url ?? null

          const invoice =
            typeof checkoutSession.invoice === "string"
              ? await stripe.invoices.retrieve(checkoutSession.invoice)
              : isExpandedInvoice(checkoutSession.invoice)
                ? checkoutSession.invoice
                : null
          const receiptPdfUrl = invoice?.invoice_pdf ?? null

          const { boostCheckout, ...rest } = receipt
          return {
            ...rest,
            receiptUrl,
            receiptPdfUrl,
          }
        } catch {
          const { boostCheckout, ...rest } = receipt
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
