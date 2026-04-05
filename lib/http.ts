export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {},
) {
  const { timeoutMs = 10_000, signal, ...requestInit } = init
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  const abortListener = () => controller.abort()
  if (signal) {
    if (signal.aborted) {
      controller.abort()
    } else {
      signal.addEventListener("abort", abortListener, { once: true })
    }
  }

  try {
    return await fetch(input, {
      ...requestInit,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
    signal?.removeEventListener("abort", abortListener)
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export async function readJsonOrNull<T>(res: Response): Promise<T | null> {
  return res.json().catch(() => null)
}

export function getErrorMessage(payload: unknown, fallback = "Request failed") {
  if (isRecord(payload) && typeof payload.error === "string" && payload.error.trim().length > 0) {
    return payload.error
  }
  return fallback
}
