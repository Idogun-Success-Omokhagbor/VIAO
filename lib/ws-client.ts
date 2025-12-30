"use client"

type Listener = (data: any) => void

interface WsOptions {
  userId: string
  onMessage: Listener
}

const WS_PORT = process.env.NEXT_PUBLIC_WS_PORT || "3001"
const WS_PATH = process.env.NEXT_PUBLIC_WS_PATH || ""

function buildUrl() {
  if (typeof window === "undefined") return ""
  const { protocol, hostname } = window.location
  const isSecure = protocol === "https:"
  const hostPort = WS_PORT || (isSecure ? "443" : "80")
  return `${isSecure ? "wss" : "ws"}://${hostname}:${hostPort}${WS_PATH}`
}

export function createWsClient({ userId, onMessage }: WsOptions) {
  let socket: WebSocket | null = null
  let closed = false
  let retryMs = 1000

  const connect = () => {
    if (closed) return
    const url = buildUrl()
    if (!url) return
    socket = new WebSocket(url)

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
      setTimeout(connect, retryMs)
      retryMs = Math.min(retryMs * 2, 15000)
    })

    socket.addEventListener("error", () => {
      socket?.close()
    })
  }

  connect()

  return {
    close() {
      closed = true
      socket?.close()
    },
  }
}
