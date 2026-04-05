import Link from "next/link"
import { Bell, Eye, MapPinned, ShieldCheck, Trash2, UserRoundCog } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PublicPageShell, PublicSectionCard, publicPillClass } from "@/components/public-page-shell"

const privacySections = [
  {
    title: "What Viao collects",
    description:
      "Account basics like name, email, preferences, and the activity needed to keep saved events, RSVPs, messages, and notifications working.",
    bullets: [
      "Account details such as name, email address, and profile preferences",
      "Event activity like saves, RSVPs, reports, and organizer actions",
      "Approximate location or location-related inputs used to surface nearby events",
    ],
  },
  {
    title: "Why that data is used",
    description: "The product uses data to keep local discovery useful, your account stable, and communications relevant to the things you chose to do.",
    bullets: [
      "To show local events and community activity that matches your area or selected city",
      "To keep your shortlist, RSVPs, receipts, and account actions synced",
      "To send important updates such as resets, notifications, or event changes",
    ],
  },
  {
    title: "When information is shared",
    description: "Viao does not sell personal data. Some information may be processed by trusted infrastructure or communication providers needed to run the service.",
    bullets: [
      "Hosting, email delivery, payment, and similar service providers can process only what is needed for their role",
      "Organizers may see attendance-related information tied to their own events",
      "We may disclose information if required by law or to protect users and the platform",
    ],
  },
  {
    title: "Your controls",
    description: "You should stay in control of what remains on the account and how the platform reaches you.",
    bullets: [
      "Update your profile and account preferences at any time",
      "Request deletion or correction of personal information",
      "Turn down non-essential communications when available",
    ],
  },
] as const

export default function PrivacyPage() {
  return (
    <PublicPageShell
      eyebrow="Privacy"
      title="Privacy should protect the person without breaking the usefulness of a local event product."
      description="Viao needs a small amount of personal and activity data to make nearby discovery, RSVPs, and account features work. The goal is to use that data carefully, keep it limited, and give people control."
      highlights={[
        { icon: MapPinned, label: "Location helps find nearby events" },
        { icon: ShieldCheck, label: "Personal data is not sold" },
        { icon: UserRoundCog, label: "You can request changes or deletion" },
      ]}
      sidebarEyebrow="In practice"
      sidebarTitle="The essentials, quickly."
      sidebarDescription="These are the privacy points most guests and members usually care about before they keep using the app."
      sidebarItems={[
        {
          icon: Eye,
          title: "What is visible",
          description: "Public profile and organizer information only show what the product surface needs to function.",
        },
        {
          icon: Bell,
          title: "What may be sent",
          description: "Emails and notifications are tied to account security, activity, and event-related updates.",
        },
        {
          icon: Trash2,
          title: "How to step away",
          description: "If you need data removed or corrected, the team should be reachable without friction.",
        },
      ]}
      sidebarFooter={
        <div className="space-y-3">
          <Button asChild className="h-11 w-full rounded-full bg-[#7c5cff] text-white hover:bg-[#6c4ef7]">
            <Link href="/contact">Contact the Viao team</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full rounded-full border-[#ddd1ff] text-[#5e4ea6] hover:bg-[#f6f1ff]">
            <Link href="/terms">Read the terms</Link>
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {privacySections.map((section) => (
          <PublicSectionCard key={section.title} title={section.title} description={section.description} className="h-full">
            <ul className="space-y-3">
              {section.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3 rounded-[22px] border border-[#ece4ff] bg-white/96 px-4 py-3">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#7c5cff]" />
                  <span className="text-sm leading-7 text-[#5c4f84]">{bullet}</span>
                </li>
              ))}
            </ul>
          </PublicSectionCard>
        ))}
      </div>

      <PublicSectionCard
        eyebrow="Contact"
        title="Need a privacy action handled?"
        description="For privacy questions, data correction requests, or account deletion requests, the cleanest route is to send the team a message with the email tied to your account."
      >
        <div className="flex flex-wrap gap-3">
          {["Data access", "Correction request", "Deletion request", "Notification concerns"].map((label) => (
            <div key={label} className={publicPillClass}>
              {label}
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild className="h-11 rounded-full bg-[#7c5cff] px-5 text-white hover:bg-[#6c4ef7]">
            <Link href="/contact">Open the contact page</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-full border-[#ddd1ff] px-5 text-[#5e4ea6] hover:bg-[#f6f1ff]">
            <a href="mailto:info@viao.ch">Email info@viao.ch</a>
          </Button>
        </div>
      </PublicSectionCard>
    </PublicPageShell>
  )
}
