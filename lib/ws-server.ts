import "server-only"

import { WebSocketServer } from "ws"

type WsWithMeta = WebSocket & { userId?: string }

type WsRegistry = {
  wss: WebSocketServer
  userSockets: Map<string, Set<WsWithMeta>>
}

declare const globalThis: {
  __viaoWSS__?: WsRegistry
} & typeof global

const WS_PORT = Number(process.env.WS_PORT ?? 3001)

function attachHandlers(registry: WsRegistry) {
  const { wss, userSockets } = registry

  wss.on("connection", (socket: WsWithMeta) => {
    socket.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        if (msg?.type === "auth" && typeof msg.userId === "string") {
          socket.userId = msg.userId
          if (!userSockets.has(msg.userId)) {
            userSockets.set(msg.userId, new Set())
          }
          userSockets.get(msg.userId)?.add(socket)
        }
      } catch {
        // ignore malformed messages
      }
    })

    socket.on("close", () => {
      if (socket.userId && userSockets.has(socket.userId)) {
        userSockets.get(socket.userId)?.delete(socket)
        if ((userSockets.get(socket.userId)?.size ?? 0) === 0) {
          userSockets.delete(socket.userId)
        }
      }
    })
  })
}

export function ensureWSServer() {
  if (globalThis.__viaoWSS__) return globalThis.__viaoWSS__

  const wss = new WebSocketServer({ port: WS_PORT })
  const registry: WsRegistry = { wss, userSockets: new Map() }
  attachHandlers(registry)
  globalThis.__viaoWSS__ = registry
  return registry
}

export function broadcastToUsers(userIds: string[], payload: any) {
  const registry = ensureWSServer()
  const message = JSON.stringify(payload)
  userIds.forEach((id) => {
    const sockets = registry.userSockets.get(id)
    if (!sockets) return
    sockets.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(message)
      }
    })
  })
}
