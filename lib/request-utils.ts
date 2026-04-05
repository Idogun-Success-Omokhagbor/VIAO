function normalizeIpCandidate(value: string | null | undefined): string | null {
  let candidate = (value ?? "").trim()
  if (!candidate) return null

  if (candidate.startsWith("::ffff:")) {
    candidate = candidate.slice(7)
  }

  if (candidate.startsWith("[") && candidate.includes("]")) {
    candidate = candidate.slice(1, candidate.indexOf("]"))
  }

  if (candidate.includes(".") && candidate.includes(":")) {
    const parts = candidate.split(":")
    if (parts.length === 2 && /^\d+$/.test(parts[1] ?? "")) {
      candidate = parts[0]
    }
  }

  return candidate || null
}

export function getClientIp(headers: Pick<Headers, "get">): string | null {
  const forwardedFor = headers.get("x-forwarded-for")
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    for (const part of forwardedFor.split(",")) {
      const ip = normalizeIpCandidate(part)
      if (ip) return ip
    }
  }

  return (
    normalizeIpCandidate(headers.get("x-real-ip")) ??
    normalizeIpCandidate(headers.get("cf-connecting-ip"))
  )
}
