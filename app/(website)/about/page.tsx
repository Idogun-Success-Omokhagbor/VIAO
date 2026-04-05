import Link from "next/link"
import { ArrowRight, Compass, HeartHandshake, MapPinned, Sparkles, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PublicPageShell, PublicSectionCard, publicPillClass, publicSoftPanelClass } from "@/components/public-page-shell"

const productPillars = [
  {
    title: "For attendees",
    description: "Spot the essentials quickly, keep a shortlist, and RSVP only when an event is genuinely worth it.",
  },
  {
    title: "For organizers",
    description: "Create local events, keep details accurate, and surface the right plans to the right crowd.",
  },
  {
    title: "For communities",
    description: "Stay close to the people, venues, and moments that turn a city into something worth showing up for.",
  },
] as const

const values = [
  {
    title: "Local first",
    description: "Discovery starts with what is nearby, timely, and easy to act on instead of trying to be everything at once.",
  },
  {
    title: "Useful before signup",
    description: "Browsing should stay open. Account creation matters when someone wants to save, RSVP, or keep plans organized.",
  },
  {
    title: "Built for real plans",
    description: "The product focuses on details that actually change decisions: date, price, venue, attendance, and host trust.",
  },
] as const

export default function AboutPage() {
  return (
    <PublicPageShell
      eyebrow="About Viao"
      title="A local event product built around the moment someone decides whether a plan is worth it."
      description="Viao is designed to make nearby events easier to scan, easier to trust, and easier to keep. The goal is not endless browsing. The goal is helping someone spot a real plan quickly."
      highlights={[
        { icon: Compass, label: "Discovery that starts with local context" },
        { icon: Sparkles, label: "Clear details before commitment" },
        { icon: HeartHandshake, label: "Community and organizer trust signals" },
      ]}
      sidebarEyebrow="What Viao is for"
      sidebarTitle="The product should help people act, not dig."
      sidebarDescription="Every core surface is shaped around a simple decision: should this event stay on the shortlist, or not?"
      sidebarItems={[
        {
          icon: MapPinned,
          title: "Nearby relevance",
          description: "Location, time, and category should narrow the field fast.",
        },
        {
          icon: Users,
          title: "Real social context",
          description: "Hosts, attendance interest, and community activity should add confidence.",
        },
        {
          icon: Sparkles,
          title: "Low-friction discovery",
          description: "People should get value before being pushed into account creation.",
        },
      ]}
      sidebarFooter={
        <div className={`${publicSoftPanelClass} rounded-[24px] p-4`}>
          <p className="text-sm leading-6 text-[#6a5f8f]">Want to talk to the team about a partnership, organizer rollout, or press request?</p>
          <div className="mt-4 flex flex-col gap-3">
            <Button asChild className="h-11 rounded-full bg-[#7c5cff] px-5 text-white hover:bg-[#6c4ef7]">
              <Link href="/contact">
                Contact Viao
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-full border-[#ddd1ff] text-[#5e4ea6] hover:bg-[#f6f1ff]">
              <Link href="/support">Visit support</Link>
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-3">
        {productPillars.map((pillar) => (
          <PublicSectionCard key={pillar.title} title={pillar.title} description={pillar.description} className="h-full" />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_minmax(0,0.85fr)]">
        <PublicSectionCard
          eyebrow="Principles"
          title="The product decisions should stay close to how people really pick plans."
          description="Viao is strongest when the interface stays clear, the event details stay honest, and the app helps someone decide quickly without flooding them with noise."
        >
          <div className="grid gap-4 md:grid-cols-3">
            {values.map((value) => (
              <div key={value.title} className={`${publicSoftPanelClass} rounded-[24px] p-5`}>
                <h3 className="text-lg font-semibold text-[#24154b]">{value.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#6a5f8f]">{value.description}</p>
              </div>
            ))}
          </div>
        </PublicSectionCard>

        <PublicSectionCard
          eyebrow="Snapshot"
          title="What someone should feel on first use"
          description="Fast to understand. Clear enough to trust. Useful before the app asks for anything in return."
        >
          <div className="flex flex-wrap gap-3">
            {["Simple event discovery", "Credible local plans", "Shortlist-ready decisions", "Organizer trust cues"].map((label) => (
              <div key={label} className={publicPillClass}>
                {label}
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[24px] border border-[#ebe2ff] bg-[linear-gradient(180deg,#ffffff,#faf7ff)] p-5">
            <p className="text-sm leading-7 text-[#6a5f8f]">
              That same standard should carry across the marketing homepage, legal pages, support surfaces, and the signed-in app. This pass brings the guest side much closer to that.
            </p>
          </div>
        </PublicSectionCard>
      </div>
    </PublicPageShell>
  )
}
