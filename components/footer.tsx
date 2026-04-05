import Link from "next/link"
import { ArrowRight, Mail, MapPin } from "lucide-react"

import { BrandLockup } from "@/components/brand-logo"

const exploreLinks = [
  { href: "/#featured", label: "Browse public events" },
  { href: "/about", label: "About Viao" },
  { href: "/contact", label: "Contact" },
]

const supportLinks = [
  { href: "/support", label: "Support" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
]

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-[#ece4ff] bg-[radial-gradient(circle_at_top,#f7f2ff,transparent_28%),linear-gradient(180deg,#fcfaff_0%,#f7f3ff_100%)]">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:py-16">
        <div className="overflow-hidden rounded-[36px] border border-[#ebe2ff] bg-white/92 shadow-[0_24px_70px_rgba(101,73,214,0.08)] backdrop-blur-xl">
          <div className="grid gap-10 px-8 py-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:px-10 lg:py-12">
            <div className="space-y-6">
              <BrandLockup
                className="items-start"
                iconSize={42}
                titleClassName="text-xl font-semibold text-[#24154b]"
                subtitleClassName="text-[11px] tracking-[0.24em] text-[#887ab8]"
              />
              <div className="max-w-xl space-y-3">
                <p className="text-lg font-semibold tracking-[-0.02em] text-[#24154b]">
                  Browse local events without clutter, then join when the plan is worth keeping.
                </p>
                <p className="text-sm leading-7 text-[#6a5f8f] sm:text-[15px]">
                  The public experience should feel honest: enough detail to judge the plan, clear next steps, and an
                  account ask only when it unlocks something useful.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/#featured"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#5d3df5] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4e31d7]"
                >
                  Browse events
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#ddd0ff] bg-white px-5 py-3 text-sm font-semibold text-[#4f3a96] transition-colors hover:border-[#c9b8ff] hover:text-[#3f2e82]"
                >
                  Create account
                </Link>
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#887ab8]">Explore</h3>
                <div className="space-y-3">
                  {exploreLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block text-sm font-medium text-[#4f4379] transition-colors hover:text-[#4f33d8]"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#887ab8]">Help</h3>
                <div className="space-y-3">
                  {supportLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block text-sm font-medium text-[#4f4379] transition-colors hover:text-[#4f33d8]"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#887ab8]">Contact</h3>
                <div className="space-y-3 text-sm leading-7 text-[#6a5f8f]">
                  <a
                    href="mailto:hello@viao.ch"
                    className="flex items-center gap-2 font-medium text-[#4f4379] transition-colors hover:text-[#4f33d8]"
                  >
                    <Mail className="h-4 w-4 text-[#7d68ff]" />
                    hello@viao.ch
                  </a>
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-1 h-4 w-4 text-[#7d68ff]" />
                    <span>Zurich, Switzerland</span>
                  </div>
                  <p>
                    Prefer support over guesswork? Use the{" "}
                    <Link href="/contact" className="font-medium text-[#4f33d8] hover:text-[#3f2ac5]">
                      contact page
                    </Link>{" "}
                    and we&apos;ll route it properly.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#efe7ff] px-8 py-5 lg:px-10">
            <div className="flex flex-col gap-3 text-sm text-[#7a6ea5] lg:flex-row lg:items-center lg:justify-between">
              <p>&copy; {currentYear} Viao. Built for finding nearby plans that feel worth leaving home for.</p>
              <p>Public browsing stays open. Accounts unlock saving, RSVPs, and direct organizer messages.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
