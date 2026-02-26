"use client"

type Listener = (data: any) => void

interface WsOptions {
  userId: string
  onMessage: Listener
}

const WS_URL = (process.env.NEXT_PUBLIC_WS_URL || "").trim()
const WS_PORT = (process.env.NEXT_PUBLIC_WS_PORT || "").trim()
const WS_PATH = process.env.NEXT_PUBLIC_WS_PATH || ""

function buildUrl() {
  if (typeof window === "undefined") return ""
  if (WS_URL) return WS_URL

  // In production, avoid guessing a websocket endpoint unless explicitly configured.
  if (process.env.NODE_ENV === "production" && !WS_PORT) return ""

  const { protocol, hostname } = window.location
  const isSecure = protocol === "https:"
  const hostPort = WS_PORT || (process.env.NODE_ENV === "development" ? "3001" : "")
  const portPart = hostPort ? `:${hostPort}` : ""
  return `${isSecure ? "wss" : "ws"}://${hostname}${portPart}${WS_PATH}`
}

export function createWsClient({ userId, onMessage }: WsOptions) {
  let socket: WebSocket | null = null
  let closed = false
  let retryMs = 1000
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const scheduleReconnect = () => {
    if (closed) return
    if (reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, retryMs)
    retryMs = Math.min(retryMs * 2, 15000)
  }

  const connect = () => {
    if (closed) return

    // iOS wrapper relies on polling fallback to avoid WKWebView websocket crashes.
    try {
      const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : ""
      if (/ViaoIOSApp/i.test(ua)) return
    } catch {
      // ignore
    }

    const url = buildUrl()
    if (!url) return

    try {
      socket = new WebSocket(url)
    } catch {
      scheduleReconnect()
      return
    }

    socket.addEventListener("open", () => {
      retryMs = 1000
      socket?.send(JSON.stringify({ type: "auth", userId }))
    })

    socket.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch {
        // ignore
      }
    })

    socket.addEventListener("close", () => {
      if (closed) return
      scheduleReconnect()
    })

    socket.addEventListener("error", () => {
      socket?.close()
    })
  }

  connect()

  return {
    close() {
      closed = true
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      socket?.close()
    },
  }
}
