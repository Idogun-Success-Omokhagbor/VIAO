import { NextResponse } from "next/server"
import { z } from "zod"

import { getResendClient } from "@/lib/resend"

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(5000),
  website: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Please fill in the form correctly." }, { status: 400 })
    }

    if (parsed.data.website && parsed.data.website.trim().length > 0) {
      return NextResponse.json({ success: true })
    }

    const resend = getResendClient()

    await resend.emails.send({
      from: "Viao Contact <no-reply@viao.ch>",
      to: "info@viao.ch",
      replyTo: parsed.data.email,
      subject: `[Viao Contact] ${parsed.data.subject}`,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; color: #24154b; line-height: 1.7;">
          <h2 style="margin-bottom: 16px;">New contact message from Viao</h2>
          <p><strong>Name:</strong> ${escapeHtml(parsed.data.name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(parsed.data.email)}</p>
          <p><strong>Topic:</strong> ${escapeHtml(parsed.data.subject)}</p>
          <div style="margin-top: 24px; padding: 16px; border-radius: 16px; background: #faf7ff; border: 1px solid #eee6ff;">
            ${escapeHtml(parsed.data.message).replace(/\n/g, "<br />")}
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/contact error:", error)
    return NextResponse.json({ error: "Unable to send message right now." }, { status: 500 })
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
