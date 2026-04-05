import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export const publicGlassCardClass =
  "rounded-[32px] border border-[#eee6ff] bg-white/94 backdrop-blur-xl shadow-[0_24px_70px_rgba(101,73,214,0.10)]"

export const publicSoftPanelClass =
  "rounded-[28px] border border-[#eee6ff] bg-white/96 backdrop-blur-xl shadow-[0_18px_48px_rgba(101,73,214,0.08)]"

export const publicPillClass =
  "rounded-full border border-[#e8dcff] bg-white/92 px-4 py-2 text-sm font-medium text-[#6a5f8f] shadow-[0_10px_24px_rgba(101,73,214,0.06)]"

type PublicHighlightItem = {
  icon: LucideIcon
  label: string
}

type PublicSidebarItem = {
  icon: LucideIcon
  title: string
  description: string
}

type PublicPageShellProps = {
  eyebrow: string
  title: string
  description: string
  highlights?: PublicHighlightItem[]
  sidebarEyebrow: string
  sidebarTitle: string
  sidebarDescription: string
  sidebarItems?: PublicSidebarItem[]
  sidebarFooter?: ReactNode
  children: ReactNode
  className?: string
}

type PublicSectionCardProps = {
  eyebrow?: string
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

export function PublicPageShell({
  eyebrow,
  title,
  description,
  highlights = [],
  sidebarEyebrow,
  sidebarTitle,
  sidebarDescription,
  sidebarItems = [],
  sidebarFooter,
  children,
  className,
}: PublicPageShellProps) {
  return (
    <div className="bg-[radial-gradient(circle_at_top_left,#f4efff,transparent_24%),radial-gradient(circle_at_bottom_right,#eef8ff,transparent_28%),linear-gradient(180deg,#ffffff,#faf7ff)]">
      <div className={cn("mx-auto w-full max-w-[1240px] px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:px-8 lg:pb-20", className)}>
        <section
          className={`${publicGlassCardClass} grid gap-8 overflow-hidden px-6 py-8 sm:px-8 sm:py-10 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start xl:px-10`}
        >
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#887ab8]">{eyebrow}</p>
              <div className="max-w-3xl space-y-4">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[#24154b] sm:text-5xl">
                  {title}
                </h1>
                <p className="max-w-2xl text-[17px] leading-8 text-[#6a5f8f] sm:text-lg">{description}</p>
              </div>
            </div>

            {highlights.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {highlights.map(({ icon: Icon, label }) => (
                  <div key={label} className={`inline-flex items-center gap-2 ${publicPillClass}`}>
                    <Icon className="h-4 w-4 text-[#7c5cff]" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <aside className={`${publicSoftPanelClass} h-full space-y-5 p-6`}>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#887ab8]">{sidebarEyebrow}</p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#24154b]">{sidebarTitle}</h2>
              <p className="text-sm leading-7 text-[#6a5f8f]">{sidebarDescription}</p>
            </div>

            {sidebarItems.length > 0 ? (
              <div className="space-y-3">
                {sidebarItems.map(({ icon: Icon, title: itemTitle, description: itemDescription }) => (
                  <div
                    key={itemTitle}
                    className="rounded-[24px] border border-[#eee6ff] bg-white/96 px-4 py-4 shadow-[0_10px_24px_rgba(101,73,214,0.05)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f5f0ff] text-[#7c5cff]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-semibold text-[#24154b]">{itemTitle}</p>
                        <p className="text-sm leading-6 text-[#6a5f8f]">{itemDescription}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {sidebarFooter ? <div className="pt-1">{sidebarFooter}</div> : null}
          </aside>
        </section>

        <div className="mt-8 space-y-6 sm:mt-10 sm:space-y-8">{children}</div>
      </div>
    </div>
  )
}

export function PublicSectionCard({
  eyebrow,
  title,
  description,
  children,
  className,
}: PublicSectionCardProps) {
  return (
    <section className={cn(publicSoftPanelClass, "p-6 sm:p-8", className)}>
      <div className="space-y-3">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#887ab8]">{eyebrow}</p> : null}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#24154b]">{title}</h2>
          {description ? <p className="max-w-3xl text-sm leading-7 text-[#6a5f8f] sm:text-[15px]">{description}</p> : null}
        </div>
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  )
}
