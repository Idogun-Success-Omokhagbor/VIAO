import { NextResponse } from "next/server"
import { z } from "zod"

import { fetchWithTimeout } from "@/lib/http"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool"
  content?: string | null
  tool_call_id?: string
  name?: string
  tool_calls?: ToolCall[]
}

const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2_000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4_000),
      }),
    )
    .max(12)
    .optional()
    .default([]),
})

async function listEvents(args: { limit?: number }) {
  const rawLimit = typeof args.limit === "number" ? args.limit : 50
  const limit = Math.max(1, Math.min(200, Math.floor(rawLimit)))

  const events = await prisma.event.findMany({
    where: {
      status: "PUBLISHED",
      isCancelled: false,
    },
    orderBy: [{ boostLevel: "desc" }, { isBoosted: "desc" }, { date: "asc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      category: true,
      location: true,
      city: true,
      venue: true,
      address: true,
      startsAt: true,
      endsAt: true,
      date: true,
      price: true,
      boostLevel: true,
      isBoosted: true,
      lat: true,
      lng: true,
    },
  })

  return {
    ok: true,
    count: events.length,
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      location: e.location,
      city: e.city,
      venue: e.venue,
      address: e.address,
      startsAt: e.startsAt ? e.startsAt.toISOString?.() ?? String(e.startsAt) : null,
      endsAt: e.endsAt ? e.endsAt.toISOString?.() ?? String(e.endsAt) : null,
      date: e.date ? e.date.toISOString?.() ?? String(e.date) : null,
      price: e.price,
      boostLevel: e.boostLevel,
      isBoosted: e.isBoosted,
      lat: e.lat,
      lng: e.lng,
    })),
  }
}

async function getMyProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      location: true,
      interests: true,
      avatarUrl: true,
      createdAt: true,
    },
  })

  if (!user) {
    return { ok: false, error: "User not found" }
  }

  return {
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location ?? null,
      interests: Array.isArray(user.interests) ? user.interests : [],
      avatarUrl: user.avatarUrl ?? null,
      createdAt: user.createdAt.toISOString(),
    },
  }
}

type ToolCall = {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

type ToolDefinition = {
  type: "function"
  function: {
    name: string
    description: string
    parameters: {
      type: "object"
      properties: Record<string, { type: string; description?: string }>
      required: string[]
      additionalProperties: boolean
    }
  }
}

type OpenAIResponse = {
  choices?: Array<{
    message?: {
      role?: "assistant"
      content?: string | null
      tool_calls?: ToolCall[]
    }
  }>
}

type OpenAIErrorResponse = {
  error?: {
    message?: string
  }
}

type ToolResult =
  | Awaited<ReturnType<typeof listEvents>>
  | Awaited<ReturnType<typeof getMyProfile>>
  | { ok: false; error: string }

type OpenAIRequestPayload = {
  model: string
  messages: ChatMessage[]
  tools: ToolDefinition[]
  tool_choice: "auto"
  temperature: number
}

type OpenAIRequestResult =
  | { ok: true; status: number; data: OpenAIResponse }
  | { ok: false; status: number; error: string }

function getOpenAIErrorMessage(json: unknown): string | null {
  if (!json || typeof json !== "object") return null
  const error = (json as OpenAIErrorResponse).error
  return typeof error?.message === "string" ? error.message : null
}

async function callOpenAI(payload: OpenAIRequestPayload): Promise<OpenAIRequestResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { ok: false, status: 500, error: "OPENAI_API_KEY is not set" as const }
  }

  let res: Response
  try {
    res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      timeoutMs: 30_000,
      cache: "no-store",
    })
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "OpenAI request timed out" : "OpenAI request failed"
    return { ok: false, status: 504, error: message }
  }

  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const message = getOpenAIErrorMessage(json) || "OpenAI request failed"
    return { ok: false, status: res.status, error: message }
  }

  return { ok: true, status: res.status, data: (json ?? {}) as OpenAIResponse }
}

function extractJson(content: string): { message: string; suggestions?: string[] } {
  try {
    const parsed = JSON.parse(content) as { message?: unknown; suggestions?: unknown }
    if (typeof parsed.message === "string") {
      return {
        message: parsed.message,
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.filter((s): s is string => typeof s === "string") : undefined,
      }
    }
  } catch {
  }
  return { message: content }
}

export async function GET() {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ messages: [] })
  }

  const messages = await prisma.aiChatMessage.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json({
    messages: messages.reverse().map((message) => ({
      id: message.id,
      role: message.role === "USER" ? "user" : "assistant",
      content: message.content,
      suggestions: message.suggestions.length > 0 ? message.suggestions : undefined,
      timestamp: message.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUser()

    const rawBody = (await req.json().catch(() => null)) as unknown
    const parsedBody = chatRequestSchema.safeParse(rawBody)
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 })
    }

    const { message, history } = parsedBody.data
    const model = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini"

    const tools: ToolDefinition[] = [
      {
        type: "function",
        function: {
          name: "list_events",
          description: "List events from the Viao database.",
          parameters: {
            type: "object",
            properties: {
              limit: { type: "number", description: "Maximum number of events to return (1-200)." },
            },
            required: [],
            additionalProperties: false,
          },
        },
      },
    ]

    if (session) {
      tools.push({
        type: "function",
        function: {
          name: "get_my_profile",
          description: "Return the current authenticated user's profile data (me).",
          parameters: {
            type: "object",
            properties: {},
            required: [],
            additionalProperties: false,
          },
        },
      })
    }

    const system: ChatMessage = {
      role: "system",
      content:
        "You are Viao AI Assistant. You help users discover events and answer questions using the Viao database. You can call list_events to list events, and get_my_profile to get the current user's profile. Keep answers concise. Always respond with a single JSON object (no code fences) with keys: message (string) and suggestions (string[] optional). The message must be plain English with simple grammar and must not include code snippets, language tags, or JSON.",
    }

    const messages: ChatMessage[] = [system]

    for (const h of history.slice(-12)) {
      const role = h?.role
      const content = typeof h?.content === "string" ? h.content.trim() : ""
      if ((role === "user" || role === "assistant") && content) {
        messages.push({ role, content })
      }
    }

    messages.push({ role: "user", content: message })

    const first = await callOpenAI({
      model,
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.2,
    })

    if (!first.ok) {
      return NextResponse.json({ error: first.error }, { status: first.status })
    }

    const firstData = first.data
    const choice = firstData.choices?.[0]
    const assistant = choice?.message

    const toolCalls = (assistant?.tool_calls ?? []) as ToolCall[]
    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
      const followupMessages: ChatMessage[] = [...messages]
      if (assistant) {
        followupMessages.push({
          role: "assistant",
          content: assistant.content,
          tool_calls: assistant.tool_calls,
        })
      }

      for (const call of toolCalls) {
        if (call?.type !== "function") continue

        let limitArg: number | undefined
        try {
          const args = JSON.parse(call.function.arguments || "{}") as { limit?: unknown }
          if (typeof args.limit === "number") {
            limitArg = args.limit
          }
        } catch {
          limitArg = undefined
        }

        let toolResult: ToolResult = { ok: false, error: "Unknown tool" }

        if (call.function.name === "list_events") {
          toolResult = await listEvents({ limit: limitArg })
        } else if (call.function.name === "get_my_profile") {
          if (!session) {
            toolResult = { ok: false, error: "Not signed in" }
          } else {
            toolResult = await getMyProfile(session.sub)
          }
        } else {
          toolResult = { ok: false, error: `Unknown tool: ${call.function.name}` }
        }

        followupMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(toolResult),
        })
      }

      const second = await callOpenAI({
        model,
        messages: followupMessages,
        tools,
        tool_choice: "auto",
        temperature: 0.2,
      })

      if (!second.ok) {
        return NextResponse.json({ error: second.error }, { status: second.status })
      }

      const secondData = second.data
      const content = secondData.choices?.[0]?.message?.content
      const finalText = typeof content === "string" ? content : ""
      const parsed = extractJson(finalText || "")
      const suggestions = parsed.suggestions?.filter((suggestion) => suggestion.length <= 200).slice(0, 6)
      const assistantMessage = parsed.message.trim() || "I couldn't find an answer right now."

      if (session) {
        await prisma.$transaction([
          prisma.aiChatMessage.create({
            data: {
              userId: session.sub,
              role: "USER",
              content: message,
            },
          }),
          prisma.aiChatMessage.create({
            data: {
              userId: session.sub,
              role: "ASSISTANT",
              content: assistantMessage,
              suggestions: suggestions ?? [],
            },
          }),
        ])
      }

      return NextResponse.json({ message: assistantMessage, suggestions: suggestions ?? undefined })
    }

    const content = assistant?.content
    const finalText = typeof content === "string" ? content : ""
    const parsed = extractJson(finalText || "")
    const suggestions = parsed.suggestions?.filter((suggestion) => suggestion.length <= 200).slice(0, 6)
    const assistantMessage = parsed.message.trim() || "I couldn't find an answer right now."

    if (session) {
      await prisma.$transaction([
        prisma.aiChatMessage.create({
          data: {
            userId: session.sub,
            role: "USER",
            content: message,
          },
        }),
        prisma.aiChatMessage.create({
          data: {
            userId: session.sub,
            role: "ASSISTANT",
            content: assistantMessage,
            suggestions: suggestions ?? [],
          },
        }),
      ])
    }

    return NextResponse.json({ message: assistantMessage, suggestions: suggestions ?? undefined })
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
