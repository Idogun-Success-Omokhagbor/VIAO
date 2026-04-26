import Link from "next/link"
import { ArrowRight, Compass, HeartHandshake, MapPinned, Sparkles, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PublicPageShell, PublicSectionCard, publicPillClass, publicSoftPanelClass } from "@/components/public-page-shell"

const productPillars = [
  {
    title: "For attendees",
    description: "See the essentials quickly, keep a shortlist, and RSVP when a plan is real.",
  },
  {
    title: "For organizers",
    description: "Create local events, keep details accurate, and reach the right crowd.",
  },
  {
    title: "For communities",
    description: "Stay close to the people, venues, and moments that make a city feel active.",
  },
] as const

const values = [
  {
    title: "Local first",
    description: "Discovery should start with what is nearby, timely, and easy to act on.",
  },
  {
    title: "Useful before signup",
    description: "Browsing should stay open. Accounts matter when someone wants to save or RSVP.",
  },
  {
    title: "Built for real plans",
    description: "The product should focus on the details that change decisions: date, price, venue, turnout, and host trust.",
  },
] as const

export default function AboutPage() {
  return (
    <PublicPageShell
      eyebrow="About Viao"
      title="Viao helps people find local events faster."
      description="It is built to make nearby events easy to scan, trust, and keep."
      highlights={[
        { icon: Compass, label: "Local discovery first" },
        { icon: Sparkles, label: "Clear details before signup" },
        { icon: HeartHandshake, label: "Trust signals that help" },
      ]}
      sidebarEyebrow="What Viao is for"
      sidebarTitle="The product should help people decide fast."
      sidebarDescription="See the essentials, keep the good plans, skip the rest."
      sidebarItems={[
        {
          icon: MapPinned,
          title: "Nearby relevance",
          description: "Location, time, and category should narrow the field quickly.",
        },
        {
          icon: Users,
          title: "Real social context",
          description: "Hosts, turnout, and community activity should add confidence.",
        },
        {
          icon: Sparkles,
          title: "Low-friction discovery",
          description: "People should get value before they are pushed into signup.",
        },
      ]}
      sidebarFooter={
        <div className={`${publicSoftPanelClass} rounded-[24px] p-4`}>
          <p className="text-sm leading-6 text-[#6a5f8f]">Want to talk to the team about partnerships, rollout, or press?</p>
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
          title="How the product should feel"
          description="Clear details, honest listings, and less noise between someone and a good plan."
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
          title="What first use should feel like"
          description="Clear, local, and useful before signup."
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
              That same standard should show up across the homepage, support pages, legal pages, and the app itself.
            </p>
          </div>
        </PublicSectionCard>
      </div>
    </PublicPageShell>
  )
}
