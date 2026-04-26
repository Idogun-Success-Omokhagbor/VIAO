import { Clock3, Mail, Mic2, ShieldCheck, Users } from "lucide-react"

import { ContactForm } from "@/components/contact-form"
import { PublicPageShell, PublicSectionCard, publicPillClass, publicSoftPanelClass } from "@/components/public-page-shell"

const directContactItems = [
  {
    title: "General questions",
    description: "Product questions, partnerships, and anything that does not fit elsewhere.",
  },
  {
    title: "Organizer help",
    description: "Questions about events, boosts, receipts, and organizer tools.",
  },
  {
    title: "Support and safety",
    description: "Account issues, moderation concerns, reports, and anything that needs quick routing.",
  },
] as const

export default function ContactPage() {
  return (
    <PublicPageShell
      eyebrow="Contact"
      title="Send a message to the team."
      description="Use this page for questions, support issues, organizer help, or partnerships."
      highlights={[
        { icon: Mail, label: "Direct message" },
        { icon: Clock3, label: "Reply target: 48 hours" },
        { icon: Users, label: "Organizer help welcome" },
      ]}
      sidebarEyebrow="What happens next"
      sidebarTitle="Help us route it fast."
      sidebarDescription="Pick the closest topic and include the event or account details that matter."
      sidebarItems={[
        {
          icon: ShieldCheck,
          title: "Support and reports",
          description: "If something feels off or unsafe, include the event, profile, or conversation involved.",
        },
        {
          icon: Mic2,
          title: "Partnerships and press",
          description: "Use this page for collaborations, rollout, media, or sponsor discussions.",
        },
        {
          icon: Mail,
          title: "Fallback email",
          description: "If the form is unavailable, you can still reach the team at info@viao.ch.",
        },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(280px,0.82fr)]">
        <PublicSectionCard
          eyebrow="Message"
          title="Send your message"
          description="The form sends directly through Viao."
          className="h-full"
        >
          <ContactForm />
        </PublicSectionCard>

        <PublicSectionCard
          eyebrow="Direct channels"
          title="Common reasons people use this page"
          description="The usual cases are below."
          className="h-full"
        >
          <div className="space-y-4">
            {directContactItems.map((item) => (
              <div key={item.title} className={`${publicSoftPanelClass} rounded-[24px] p-5`}>
                <h3 className="text-lg font-semibold text-[#24154b]">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#6a5f8f]">{item.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {["Attendee question", "Organizer issue", "Partnership", "Press request"].map((label) => (
              <div key={label} className={publicPillClass}>
                {label}
              </div>
            ))}
          </div>
        </PublicSectionCard>
      </div>
    </PublicPageShell>
  )
}
