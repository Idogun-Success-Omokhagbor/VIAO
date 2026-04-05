export const MAX_IMAGE_UPLOAD_BYTES = 2 * 1024 * 1024
export const MAX_IMAGE_DATA_URL_LENGTH = Math.ceil((MAX_IMAGE_UPLOAD_BYTES * 4) / 3) + 256

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number]

const IMAGE_DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/

const LOCAL_IMAGE_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])

export function normalizeImageMimeType(mimeType: string | null | undefined): AllowedImageMimeType | null {
  switch ((mimeType ?? "").toLowerCase()) {
    case "image/jpg":
    case "image/jpeg":
      return "image/jpeg"
    case "image/png":
      return "image/png"
    case "image/webp":
      return "image/webp"
    case "image/gif":
      return "image/gif"
    default:
      return null
  }
}

export function sniffImageMime(buffer: Uint8Array): AllowedImageMimeType | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg"
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png"
  }

  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp"
  }

  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return "image/gif"
  }

  return null
}

export function isSafePublicImageUrl(value: string): boolean {
  if (!value) return false
  if (value.startsWith("/")) {
    return !value.startsWith("//")
  }

  try {
    const url = new URL(value)
    if (url.protocol === "https:") return true

    return process.env.NODE_ENV !== "production" && url.protocol === "http:" && LOCAL_IMAGE_HOSTS.has(url.hostname)
  } catch {
    return false
  }
}

export function isAllowedUserProvidedImageUrl(value: string): boolean {
  if (!value) return false

  try {
    const url = new URL(value)
    if (url.protocol === "https:") return true

    return process.env.NODE_ENV !== "production" && url.protocol === "http:" && LOCAL_IMAGE_HOSTS.has(url.hostname)
  } catch {
    return false
  }
}

export function parseStoredImageDataUrl(dataUrl: string): { mime: AllowedImageMimeType; buffer: Buffer } | null {
  if (dataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) return null

  const match = IMAGE_DATA_URL_PATTERN.exec(dataUrl)
  if (!match) return null

  const mime = normalizeImageMimeType(match[1])
  if (!mime) return null

  let buffer: Buffer
  try {
    buffer = Buffer.from(match[2], "base64")
  } catch {
    return null
  }

  if (buffer.length === 0 || buffer.length > MAX_IMAGE_UPLOAD_BYTES) return null

  return sniffImageMime(buffer) === mime ? { mime, buffer } : null
}

export function toEventImageUrl(eventId: string, src: unknown, index?: number): string | null {
  if (typeof src !== "string" || src.trim().length === 0) return null
  if (src.startsWith("data:")) {
    return typeof index === "number" ? `/api/events/${eventId}/image?index=${index}` : `/api/events/${eventId}/image`
  }

  return isSafePublicImageUrl(src) ? src : null
}

export function toEventImageUrls(eventId: string, sources: unknown, fallback?: string | null): string[] {
  if (!Array.isArray(sources)) {
    return fallback ? [fallback] : []
  }

  const resolved = sources
    .map((src, index) => toEventImageUrl(eventId, src, index))
    .filter((src): src is string => typeof src === "string" && src.length > 0)

  if (resolved.length > 0) return resolved
  return fallback ? [fallback] : []
}
