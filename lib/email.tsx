import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailData {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailData) {
  try {
    const data = await resend.emails.send({
      from: "Viao <noreply@viao.app>",
      to: [to],
      subject,
      html,
    })

    return { success: true, data }
  } catch (error) {
    console.error("Email sending failed:", error)
    return { success: false, error }
  }
}

export function generateWelcomeEmail(name: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Viao</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #7c3aed;">Welcome to Viao, ${name}!</h1>
          <p>Thank you for joining our community of event enthusiasts and local explorers.</p>
          <p>With Viao, you can:</p>
          <ul>
            <li>Discover amazing events in your area</li>
            <li>Connect with like-minded people</li>
            <li>Create and promote your own events</li>
            <li>Get personalized recommendations from our AI assistant</li>
          </ul>
          <p>Ready to get started? <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color: #7c3aed;">Explore events now</a></p>
          <p>Best regards,<br>The Viao Team</p>
        </div>
      </body>
    </html>
  `
}

export function generateEventReminderEmail(name: string, eventTitle: string, eventDate: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Event Reminder</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #7c3aed;">Don't forget about your event!</h1>
          <p>Hi ${name},</p>
          <p>This is a friendly reminder about the upcoming event you're attending:</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0 0 10px 0; color: #7c3aed;">${eventTitle}</h2>
            <p style="margin: 0; font-weight: bold;">Date: ${eventDate}</p>
          </div>
          <p>We're excited to see you there!</p>
          <p>Best regards,<br>The Viao Team</p>
        </div>
      </body>
    </html>
  `
}
