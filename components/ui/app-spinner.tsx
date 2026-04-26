"use client"

import { MoonLoader } from "react-spinners"

import { cn } from "@/lib/utils"

type AppSpinnerProps = {
  label?: string
  size?: "sm" | "md" | "lg"
  className?: string
  fullHeight?: boolean
}

const spinnerSizeMap = {
  sm: 16,
  md: 22,
  lg: 34,
} as const

const auraClassMap = {
  sm: "h-10 w-10",
  md: "h-14 w-14",
  lg: "h-20 w-20",
} as const

export function AppSpinner({
  label = "Loading...",
  size = "md",
  className,
  fullHeight = false,
}: AppSpinnerProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        fullHeight ? "min-h-[240px]" : "py-2",
        className,
      )}
    >
      <div className="relative flex items-center justify-center">
        <div
          className={cn(
            "absolute rounded-full bg-[radial-gradient(circle,rgba(124,92,255,0.18),rgba(111,217,255,0.10),transparent_72%)] blur-xl",
            auraClassMap[size],
          )}
        />
        <MoonLoader color="#7c5cff" size={spinnerSizeMap[size]} speedMultiplier={0.9} />
      </div>
      <p className="text-sm font-medium text-[#5f5679]">{label}</p>
    </div>
  )
}
