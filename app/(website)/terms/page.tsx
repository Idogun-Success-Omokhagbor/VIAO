import Link from "next/link"
import { CreditCard, FileText, ShieldAlert, Ticket, UserCheck, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PublicPageShell, PublicSectionCard, publicPillClass } from "@/components/public-page-shell"

const termsSections = [
  {
    title: "Accounts and access",
    description: "Users are expected to keep account information accurate, keep access secure, and use the product lawfully.",
    bullets: [
      "You are responsible for the information attached to your account",
      "Login credentials and password reset codes should be kept private",
      "Accounts may be limited or suspended for abuse, fraud, or unlawful use",
    ],
  },
  {
    title: "Events and organizer responsibility",
    description: "Organizers are responsible for the accuracy of event details, changes, cancellations, and anything promised to attendees.",
    bullets: [
      "Event titles, dates, locations, pricing, and descriptions should stay accurate",
      "Illegal, harmful, misleading, or abusive content is not allowed",
      "Viao can remove content or restrict accounts that put users or the platform at risk",
    ],
  },
  {
    title: "Payments and promotion",
    description: "Any paid promotion, boost, receipt, or checkout feature is subject to platform rules and the terms of the payment providers involved.",
    bullets: [
      "Paid promotion does not guarantee a specific commercial result",
      "Charge handling and settlement depend on the configured payment provider",
      "Receipts and organizer billing records should be reviewed by the organizer for accuracy",
    ],
  },
  {
    title: "Platform boundaries",
    description: "Viao helps people discover and manage events, but does not replace organizer judgment, legal compliance, or offline event responsibility.",
    bullets: [
      "Organizers remain responsible for the event itself",
      "Attendees remain responsible for the choices they make after discovery",
      "The platform may change or improve features over time",
    ],
  },
] as const

export default function TermsPage() {
  return (
    <PublicPageShell
      eyebrow="Terms"
      title="The rules should stay clear for attendees, organizers, and the platform team."
      description="These terms explain the basics of using Viao responsibly. The product should stay useful and safe for the people browsing, creating, and managing local events through it."
      highlights={[
        { icon: UserCheck, label: "Accounts should stay accurate and secure" },
        { icon: Ticket, label: "Organizers own their event accuracy" },
        { icon: CreditCard, label: "Paid promotion follows platform rules" },
      ]}
      sidebarEyebrow="Quick read"
      sidebarTitle="What matters most before using the app"
      sidebarDescription="If someone only scans the essentials, these are the parts that affect day-to-day use the most."
      sidebarItems={[
        {
          icon: FileText,
          title: "Use the platform honestly",
          description: "Fake listings, abuse, fraud, and harmful content can lead to removal or account action.",
        },
        {
          icon: Wallet,
          title: "Treat boosts and billing carefully",
          description: "Promotion tools can improve visibility, but they do not guarantee event outcomes.",
        },
        {
          icon: ShieldAlert,
          title: "Respect organizer and attendee safety",
          description: "The platform can act when behavior threatens trust, legality, or user experience.",
        },
      ]}
      sidebarFooter={
        <div className="space-y-3">
          <Button asChild className="h-11 w-full rounded-full bg-[#7c5cff] text-white hover:bg-[#6c4ef7]">
            <Link href="/privacy">Privacy policy</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full rounded-full border-[#ddd1ff] text-[#5e4ea6] hover:bg-[#f6f1ff]">
            <Link href="/contact">Questions about the terms</Link>
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {termsSections.map((section) => (
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
        eyebrow="Related"
        title="The terms work alongside privacy and support."
        description="If a question is practical rather than legal, support or contact is usually the faster route. If the issue is about personal information, check the privacy page as well."
      >
        <div className="flex flex-wrap gap-3">
          {["Account access", "Organizer content", "Boost billing", "Moderation and abuse"].map((label) => (
            <div key={label} className={publicPillClass}>
              {label}
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild className="h-11 rounded-full bg-[#7c5cff] px-5 text-white hover:bg-[#6c4ef7]">
            <Link href="/support">Open support</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-full border-[#ddd1ff] px-5 text-[#5e4ea6] hover:bg-[#f6f1ff]">
            <Link href="/contact">Contact the team</Link>
          </Button>
        </div>
      </PublicSectionCard>
    </PublicPageShell>
  )
}
