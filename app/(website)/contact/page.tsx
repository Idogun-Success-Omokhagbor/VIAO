import { Clock3, Mail, Mic2, ShieldCheck, Users } from "lucide-react"

import { ContactForm } from "@/components/contact-form"
import { PublicPageShell, PublicSectionCard, publicPillClass, publicSoftPanelClass } from "@/components/public-page-shell"

const directContactItems = [
  {
    title: "General questions",
    description: "Product questions, partnerships, and requests that do not fit elsewhere.",
  },
  {
    title: "Organizer help",
    description: "Questions about events, boosts, receipts, and organizer-facing tools.",
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
      title="Send a message and it should land with the right team without friction."
      description="The contact page should feel like a real product surface, not a dead-end form. Use it for attendee questions, organizer issues, partnerships, or support requests."
      highlights={[
        { icon: Mail, label: "Direct message to the team" },
        { icon: Clock3, label: "Typical reply within 48 hours" },
        { icon: Users, label: "Organizers and partners welcome" },
      ]}
      sidebarEyebrow="What happens next"
      sidebarTitle="The message should be easy to route."
      sidebarDescription="Choose the topic that is closest, explain the problem clearly, and include the event or account details that matter."
      sidebarItems={[
        {
          icon: ShieldCheck,
          title: "Support and reports",
          description: "If something feels off or unsafe, include the event, profile, or conversation involved.",
        },
        {
          icon: Mic2,
          title: "Partnerships and press",
          description: "Use the contact flow for collaborations, rollouts, media, or sponsor discussions.",
        },
        {
          icon: Mail,
          title: "Fallback email",
          description: "If the form is unavailable, the team can still be reached at info@viao.ch.",
        },
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(280px,0.82fr)]">
        <PublicSectionCard
          eyebrow="Message"
          title="Write the message here"
          description="The form sends directly through the product, so there is no need to copy everything into a separate email client."
          className="h-full"
        >
          <ContactForm />
        </PublicSectionCard>

        <PublicSectionCard
          eyebrow="Direct channels"
          title="When to use this page"
          description="These are the main reasons people usually land here."
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
