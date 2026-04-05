import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type BrandMarkProps = {
  size?: number
  className?: string
}

type BrandLockupProps = {
  className?: string
  iconSize?: number
  title?: string
  subtitle?: string
  titleClassName?: string
  subtitleClassName?: string
  endSlot?: ReactNode
}

export function BrandMark({ size = 40, className }: BrandMarkProps) {
  return (
    <span
      aria-label="Viao logo"
      role="img"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-[22%] border border-[#e7defe] bg-gradient-to-br from-white via-white to-[#f3efff] shadow-[0_8px_22px_rgba(117,86,255,0.16)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <span
        aria-hidden="true"
        className="font-black leading-none tracking-[-0.08em] text-transparent"
        style={{
          fontSize: Math.max(18, Math.round(size * 0.66)),
          backgroundImage: "linear-gradient(135deg, #5b34ff 8%, #8d63ff 52%, #b28cff 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          transform: "translateY(-1px)",
          fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        V
      </span>
    </span>
  )
}

export function BrandLockup({
  className,
  iconSize = 40,
  title = "Viao",
  subtitle = "Local experiences",
  titleClassName,
  subtitleClassName,
  endSlot,
}: BrandLockupProps) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <BrandMark size={iconSize} />
      <span className="min-w-0">
        <span className={cn("block truncate text-lg font-semibold leading-none text-[#24154b]", titleClassName)}>{title}</span>
        {subtitle ? (
          <span
            className={cn(
              "block truncate text-xs uppercase tracking-[0.22em] text-[#887ab8]",
              subtitleClassName,
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
      {endSlot}
    </span>
  )
}
