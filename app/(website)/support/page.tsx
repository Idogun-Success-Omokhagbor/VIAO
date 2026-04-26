import Link from "next/link"
import { CalendarRange, LifeBuoy, Mail, MapPinned, ShieldCheck, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PublicPageShell, PublicSectionCard, publicPillClass, publicSoftPanelClass } from "@/components/public-page-shell"

const supportTopics = [
  {
    title: "Account and sign-in help",
    description: "Password resets, access issues, profile updates, and other account questions.",
  },
  {
    title: "Event browsing or RSVP issues",
    description: "Something looks wrong in the feed, an RSVP feels off, or a saved event is not behaving as expected.",
  },
  {
    title: "Organizer and billing questions",
    description: "Event edits, boosts, receipts, or organizer flows that need clarification.",
  },
  {
    title: "Reports, safety, or community concerns",
    description: "Questions about content, moderation, or conduct on the platform.",
  },
] as const

const faqItems = [
  {
    title: "I cannot find good nearby events.",
    description: "Try city, time, and category filters first. If the feed still looks wrong, tell support which city you expected to browse.",
  },
  {
    title: "An event changed after I saved it.",
    description: "Organizers can update details. If something looks misleading, report the event or contact support with the link.",
  },
  {
    title: "I need help with organizer tools.",
    description: "Use the contact page and choose organizer help so the right message lands with the team quickly.",
  },
] as const

export default function SupportPage() {
  return (
    <PublicPageShell
      eyebrow="Support"
      title="Get help without the runaround."
      description="If something feels broken, unclear, or off, support should get you moving again."
      highlights={[
        { icon: LifeBuoy, label: "Clear help paths" },
        { icon: Mail, label: "Reply target: 48 hours" },
        { icon: ShieldCheck, label: "Safety questions included" },
      ]}
      sidebarEyebrow="Best first step"
      sidebarTitle="Send the useful details."
      sidebarDescription="Include the account email, event, page, or action involved."
      sidebarItems={[
        {
          icon: CalendarRange,
          title: "Event issue",
          description: "Include the event title or link, plus what should have happened instead.",
        },
        {
          icon: Users,
          title: "Account or community issue",
          description: "Include the email tied to the account and the screen or action that failed.",
        },
        {
          icon: MapPinned,
          title: "Discovery or location issue",
          description: "Tell the team what city or area you expected to see so they can reproduce it.",
        },
      ]}
      sidebarFooter={
        <div className="space-y-3">
          <Button asChild className="h-11 w-full rounded-full bg-[#7c5cff] text-white hover:bg-[#6c4ef7]">
            <Link href="/contact">Contact support</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full rounded-full border-[#ddd1ff] text-[#5e4ea6] hover:bg-[#f6f1ff]">
            <a href="mailto:info@viao.ch?subject=Viao%20Support">Email info@viao.ch</a>
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {supportTopics.map((topic) => (
          <PublicSectionCard key={topic.title} title={topic.title} description={topic.description} className="h-full" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_minmax(0,0.85fr)]">
        <PublicSectionCard
          eyebrow="Common questions"
          title="Common questions"
          description="These are the usual things people want answered fast."
        >
          <div className="space-y-4">
            {faqItems.map((item) => (
              <div key={item.title} className={`${publicSoftPanelClass} rounded-[24px] p-5`}>
                <h3 className="text-lg font-semibold text-[#24154b]">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#6a5f8f]">{item.description}</p>
              </div>
            ))}
          </div>
        </PublicSectionCard>

        <PublicSectionCard
          eyebrow="Short route"
          title="Not sure where to start?"
          description="Use the contact page and choose the closest topic."
        >
          <div className="flex flex-wrap gap-3">
            {["Account issue", "Organizer help", "Billing question", "Safety concern"].map((label) => (
              <div key={label} className={publicPillClass}>
                {label}
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[24px] border border-[#ece4ff] bg-white/96 p-5">
            <p className="text-sm leading-7 text-[#6a5f8f]">
              Include the event, page, or account email and support can usually move faster.
            </p>
          </div>
        </PublicSectionCard>
      </div>
    </PublicPageShell>
  )
}
