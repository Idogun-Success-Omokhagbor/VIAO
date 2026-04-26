import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react"

import { PublicEventActions } from "@/components/public-event-actions"
import {
  PublicPageShell,
  PublicSectionCard,
  publicGlassCardClass,
  publicPillClass,
  publicSoftPanelClass,
} from "@/components/public-page-shell"
import { AppImage } from "@/components/ui/app-image"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/current-user"
import { getPublicEventById } from "@/lib/public-events"
import { formatBoostCountdown, getBoostCountdownToneClass } from "@/lib/utils"
import type { Event } from "@/types/event"

function getEventStart(event: Event) {
  return new Date(event.startsAt ?? event.date)
}

function formatEventMoment(event: Event) {
  const value = getEventStart(event)

  if (Number.isNaN(value.getTime())) {
    return "Date to be announced"
  }

  return value.toLocaleString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatEventDateRange(event: Event) {
  const start = getEventStart(event)
  if (Number.isNaN(start.getTime())) {
    return "Date to be announced"
  }

  if (!event.endsAt) {
    return start.toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const end = new Date(event.endsAt)
  if (Number.isNaN(end.getTime())) {
    return start.toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  return `${start.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} to ${end.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  })}`
}

function formatPrice(price: number | null | undefined) {
  if (price === 0) {
    return "Free"
  }

  if (typeof price === "number") {
    return `CHF ${price}`
  }

  return "Price to be confirmed"
}

function describeLocation(event: Event) {
  const venue = typeof event.venue === "string" && event.venue.trim().length > 0 ? event.venue.trim() : ""
  const city = typeof event.city === "string" && event.city.trim().length > 0 ? event.city.trim() : ""
  const location = typeof event.location === "string" && event.location.trim().length > 0 ? event.location.trim() : ""

  if (venue && city) {
    return `${venue}, ${city}`
  }

  if (location) {
    return location
  }

  return city || "Location to be announced"
}

function buildHeroDescription(event: Event) {
  const location = describeLocation(event)
  const price = formatPrice(event.price)
  const attendees = typeof event.attendeesCount === "number" ? `${event.attendeesCount} planning to attend` : "Open public event"
  return `${formatEventMoment(event)} in ${location}. ${price}. ${attendees}.`
}

function getEventImage(event: Event) {
  return event.imageUrls?.[0] ?? event.imageUrl ?? event.image ?? "/placeholder.svg"
}

async function loadPublicEvent(id: string) {
  const user = await getCurrentUser()
  const event = await getPublicEventById(id, user?.id)
  return { user, event }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const event = await getPublicEventById(id)

  if (!event) {
    return {
      title: "Event Not Available | Viao",
      description: "This public event is no longer available to browse on Viao.",
    }
  }

  return {
    title: `${event.title} | Viao`,
    description: buildHeroDescription(event),
  }
}

function EventUnavailableState() {
  return (
    <div className="pb-28 lg:pb-0">
      <PublicPageShell
        eyebrow="Event unavailable"
        title="This event is not available on the public site."
        description="It may have ended, been unpublished, or been removed from the live feed."
        highlights={[
          { icon: Sparkles, label: "Public browsing stays focused on live events" },
          { icon: ShieldCheck, label: "Unavailable events are hidden instead of misleading guests" },
        ]}
        sidebarEyebrow="Next step"
        sidebarTitle="Keep browsing live events."
        sidebarDescription="The homepage is still the best place to find public events that are open to browse."
        sidebarItems={[
          {
            icon: CalendarDays,
            title: "See what is live now",
            description: "Upcoming public events stay grouped in one place instead of behind signup walls.",
          },
          {
            icon: HeartHandshake,
            title: "Join only when it is worth it",
            description: "Accounts matter when someone wants to save, RSVP, or keep a shortlist.",
          },
        ]}
        sidebarFooter={
          <Button asChild className="h-11 w-full rounded-full bg-[#7c5cff] text-white hover:bg-[#6948ff]">
            <Link href="/#featured">
              Back to browse
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
      >
        <PublicSectionCard
          eyebrow="Why this matters"
          title="The public route should stay honest."
          description="If an event is no longer public, the page should say so clearly."
        />
      </PublicPageShell>
    </div>
  )
}

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user, event } = await loadPublicEvent(id)

  if (!event) {
    return <EventUnavailableState />
  }

  const boostCountdown = formatBoostCountdown(event.boostUntil)
  const countdownToneClass = getBoostCountdownToneClass(event.boostUntil)
  const detailItems = [
    {
      icon: CalendarDays,
      label: "Date",
      value: formatEventDateRange(event),
    },
    {
      icon: Clock3,
      label: "Starts",
      value: event.time?.trim() || formatEventMoment(event),
    },
    {
      icon: MapPin,
      label: "Location",
      value: describeLocation(event),
    },
    {
      icon: Ticket,
      label: "Price",
      value: formatPrice(event.price),
    },
  ]

  return (
    <div className="pb-28 lg:pb-0">
      <PublicPageShell
        eyebrow="Public event"
        title={event.title}
        description={buildHeroDescription(event)}
        highlights={[
          { icon: CalendarDays, label: formatEventMoment(event) },
          { icon: MapPin, label: describeLocation(event) },
          { icon: Users, label: `${event.attendeesCount ?? 0} attending` },
        ]}
        sidebarEyebrow={user ? "Open in app" : "Browse first"}
        sidebarTitle={user ? "Open this in your account." : "Check the details first."}
        sidebarDescription={
          user
            ? "Save it, RSVP, or manage it in the app."
            : "Use the public page to decide first. Save and RSVP later if it becomes a real yes."
        }
        sidebarItems={[
          {
            icon: ShieldCheck,
            title: "See the essentials",
            description: "Date, place, price, and turnout are visible right away.",
          },
          {
            icon: HeartHandshake,
            title: "Join later",
            description: "Saving, RSVPing, and organizer messaging sit behind the account wall.",
          },
          {
            icon: Sparkles,
            title: "Easy on mobile",
            description: "The page stays readable and usable on smaller screens.",
          },
        ]}
        sidebarFooter={<PublicEventActions eventId={event.id} eventTitle={event.title} eventDescription={event.description} />}
      >
        <section className={`${publicGlassCardClass} overflow-hidden p-0`}>
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.08fr)_420px]">
            <div className="relative min-h-[280px] overflow-hidden sm:min-h-[380px]">
              <AppImage
                src={getEventImage(event)}
                alt={event.title}
                fill
                priority
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(27,16,68,0.14),rgba(27,16,68,0.52))]" />

              <div className="absolute left-5 right-5 top-5 flex flex-wrap items-center gap-2">
                <div className="rounded-full bg-white/92 px-3 py-1.5 text-sm font-semibold text-[#24154b]">
                  {event.category}
                </div>
                {event.isBoosted ? (
                  <div className="rounded-full bg-[#f6d54b] px-3 py-1.5 text-sm font-semibold text-[#5e4300]">Featured</div>
                ) : null}
                {boostCountdown ? <div className={`rounded-full px-3 py-1.5 text-sm font-semibold ${countdownToneClass}`}>{boostCountdown}</div> : null}
              </div>

              <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-end justify-between gap-3">
                <div className="max-w-xl rounded-[24px] bg-white/16 px-4 py-3 text-white backdrop-blur-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">At a glance</p>
                  <p className="mt-2 text-sm leading-7 text-white/92">{buildHeroDescription(event)}</p>
                </div>
                <div className="rounded-full bg-white/92 px-4 py-2 text-sm font-semibold text-[#24154b] shadow-[0_12px_24px_rgba(0,0,0,0.12)]">
                  {formatPrice(event.price)}
                </div>
              </div>
            </div>

            <div className="space-y-5 p-6 sm:p-8">
              <Button asChild variant="ghost" className="h-10 rounded-full px-0 text-[#5e4ea6] hover:bg-transparent hover:text-[#4f33d8]">
                <Link href="/#featured">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to the public feed
                </Link>
              </Button>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                {detailItems.map(({ icon: Icon, label, value }) => (
                  <div key={label} className={`${publicSoftPanelClass} rounded-[24px] px-4 py-4`}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f5f0ff] text-[#7c5cff]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#887ab8]">{label}</p>
                        <p className="text-sm font-medium leading-7 text-[#24154b]">{value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className={`${publicSoftPanelClass} rounded-[24px] p-5`}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#887ab8]">Why it is public</p>
                <p className="mt-3 text-sm leading-7 text-[#6a5f8f]">
                  You should be able to judge the plan before the app asks for an account.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.08fr_minmax(0,0.92fr)]">
          <PublicSectionCard
            eyebrow="About the event"
            title="What to know before you say yes."
            description="The basics should be easy to judge."
          >
            <div className="space-y-5">
              <p className="text-[15px] leading-8 text-[#4f4379] sm:text-base">{event.description}</p>
              <div className="flex flex-wrap gap-3">
                <div className={publicPillClass}>{event.maxAttendees ? `${event.maxAttendees} max capacity` : "Open capacity"}</div>
                <div className={publicPillClass}>{event.attendeesCount ?? 0} going</div>
                <div className={publicPillClass}>{event.isBoosted ? "Featured in discovery" : "Standard discovery listing"}</div>
              </div>
            </div>
          </PublicSectionCard>

          <PublicSectionCard
            eyebrow="Organizer"
            title={`${event.organizerName ?? "Organizer"} is hosting this plan.`}
            description="Enough host context to build trust."
          >
            <div className="space-y-4">
              <div className={`${publicSoftPanelClass} rounded-[24px] p-5`}>
                <p className="text-sm font-semibold text-[#24154b]">{event.organizerName ?? "Organizer"}</p>
                <p className="mt-2 text-sm leading-7 text-[#6a5f8f]">
                  Save, RSVP, reminders, and organizer messaging unlock in the account flow.
                </p>
              </div>
              <div className={`${publicSoftPanelClass} rounded-[24px] p-5`}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#887ab8]">Why this route works</p>
                <p className="mt-3 text-sm leading-7 text-[#6a5f8f]">
                  Browsing stays open. Commitment can happen later.
                </p>
              </div>
            </div>
          </PublicSectionCard>
        </div>
      </PublicPageShell>
    </div>
  )
}
