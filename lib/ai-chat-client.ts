import type { ComponentPropsWithoutRef } from "react"

import { getViaoAIResponseWithHistory } from "@/lib/viao-ai-assistant"

export type AiUiMessage = {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
  suggestions?: string[]
}

type StoredAiMessage = {
  id?: string | number
  content?: string
  role?: "user" | "assistant" | string
  timestamp?: string
  suggestions?: string[]
}

type AiChatHistoryResponse = {
  messages?: StoredAiMessage[]
}

export type MarkdownAnchorProps = ComponentPropsWithoutRef<"a">

export async function loadAiHistory() {
  const res = await fetch("/api/ai/chat", { credentials: "include", cache: "no-store" })
  const data = (await res.json().catch(() => null)) as AiChatHistoryResponse | null

  if (!res.ok) return null

  const raw = Array.isArray(data?.messages) ? data.messages : []
  if (raw.length === 0) return []

  return raw
    .filter((message) => message && typeof message.content === "string")
    .map(
      (message): AiUiMessage => ({
        id: String(message.id ?? `${Date.now()}`),
        content: message.content ?? "",
        isUser: message.role === "user",
        timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
        suggestions: Array.isArray(message.suggestions) ? message.suggestions : undefined,
      }),
    )
}

export function buildAiHistory(messages: AiUiMessage[]) {
  return messages
    .filter((message) => typeof message.content === "string" && message.content.trim().length > 0)
    .slice(-12)
    .map((message) => ({
      role: message.isUser ? ("user" as const) : ("assistant" as const),
      content: message.content,
    }))
}

export async function sendAiMessage(input: string, messages: AiUiMessage[]) {
  return getViaoAIResponseWithHistory(input, buildAiHistory(messages))
}
