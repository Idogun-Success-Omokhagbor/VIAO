import "server-only"

import type WebSocket from "ws"
import type { RawData, WebSocketServer } from "ws"

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
    socket.on("message", (raw: RawData) => {
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

  process.env.WS_NO_BUFFER_UTIL = "1"
  process.env.WS_NO_UTF_8_VALIDATE = "1"

  const { WebSocketServer: WebSocketServerImpl } = require("ws") as typeof import("ws")

  const wss = new WebSocketServerImpl({ port: WS_PORT })
  const registry: WsRegistry = { wss, userSockets: new Map() }
  attachHandlers(registry)
  globalThis.__viaoWSS__ = registry
  return registry
}

export function isUserConnected(userId: string): boolean {
  const registry = ensureWSServer()
  const sockets = registry.userSockets.get(userId)
  return (sockets?.size ?? 0) > 0
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
