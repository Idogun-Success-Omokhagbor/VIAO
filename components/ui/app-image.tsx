"use client"

import Image from "next/image"
import type { ImgHTMLAttributes } from "react"

import { cn } from "@/lib/utils"

type AppImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "width" | "height"> & {
  src?: string | null
  alt: string
  width?: number
  height?: number
  fill?: boolean
  sizes?: string
  priority?: boolean
}

function resolveImageSrc(src?: string | null): string {
  if (typeof src !== "string" || src.trim().length === 0) {
    return "/placeholder.svg"
  }

  return src
}

function canUseNextImage(src: string): boolean {
  return src.startsWith("/")
}

export function AppImage({
  src,
  alt,
  className,
  width,
  height,
  fill = false,
  sizes,
  priority = false,
  ...imgProps
}: AppImageProps) {
  const resolvedSrc = resolveImageSrc(src)

  if (canUseNextImage(resolvedSrc)) {
    if (fill) {
      return (
        <Image
          src={resolvedSrc}
          alt={alt}
          fill
          sizes={sizes ?? "100vw"}
          priority={priority}
          unoptimized
          className={className}
        />
      )
    }

    return (
      <Image
        src={resolvedSrc}
        alt={alt}
        width={width ?? 1200}
        height={height ?? 800}
        sizes={sizes}
        priority={priority}
        unoptimized
        className={className}
      />
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      loading={priority ? undefined : "lazy"}
      decoding="async"
      className={cn(fill && "absolute inset-0 h-full w-full", className)}
      {...imgProps}
    />
  )
}
