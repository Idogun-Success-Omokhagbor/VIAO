import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/session"

type ChatMessage = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; name?: string }

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

async function callOpenAI(payload: any) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return { ok: false, status: 500, error: "OPENAI_API_KEY is not set" as const }
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const message = (json as any)?.error?.message || "OpenAI request failed"
    return { ok: false, status: res.status, error: message }
  }

  return { ok: true, status: res.status, data: json }
}

function extractJson(content: string): { message: string; suggestions?: string[] } {
  try {
    const parsed = JSON.parse(content) as any
    if (parsed && typeof parsed.message === "string") {
      return {
        message: parsed.message,
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.filter((s: any) => typeof s === "string") : undefined,
      }
    }
  } catch {
  }
  return { message: content }
}

export async function GET() {
  // Chats are not persisted; return an empty history for compatibility.
  return NextResponse.json({ messages: [] })
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUser()

    const body = (await req.json().catch(() => null)) as any
    const message = typeof body?.message === "string" ? body.message.trim() : ""

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 })
    }

    const history = Array.isArray(body?.history) ? body.history : []

    const tools: any[] = [
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

    const messages: any[] = [system]

    for (const h of history.slice(-12)) {
      const role = h?.role
      const content = typeof h?.content === "string" ? h.content.trim() : ""
      if ((role === "user" || role === "assistant") && content) {
        messages.push({ role, content })
      }
    }

    messages.push({ role: "user", content: message })

    const first = await callOpenAI({
      model: "gpt-4o-mini",
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.2,
    })

    if (!first.ok) {
      return NextResponse.json({ error: first.error }, { status: first.status })
    }

    const choice = (first.data as any)?.choices?.[0]
    const assistant = choice?.message

    const toolCalls = (assistant?.tool_calls ?? []) as ToolCall[]
    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
      const followupMessages: any[] = [...messages]
      followupMessages.push(assistant)

      for (const call of toolCalls) {
        if (call?.type !== "function") continue

        let args: any = {}
        try {
          args = JSON.parse(call.function.arguments || "{}")
        } catch {
          args = {}
        }

        let toolResult: any = { ok: false, error: "Unknown tool" }

        if (call.function.name === "list_events") {
          toolResult = await listEvents({ limit: typeof args?.limit === "number" ? args.limit : undefined })
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
        model: "gpt-4o-mini",
        messages: followupMessages,
        tools,
        tool_choice: "auto",
        temperature: 0.2,
      })

      if (!second.ok) {
        return NextResponse.json({ error: second.error }, { status: second.status })
      }

      const content = (second.data as any)?.choices?.[0]?.message?.content
      const finalText = typeof content === "string" ? content : ""
      const parsed = extractJson(finalText || "")

      return NextResponse.json({ message: parsed.message, suggestions: parsed.suggestions ?? undefined })
    }

    const content = assistant?.content
    const finalText = typeof content === "string" ? content : ""
    const parsed = extractJson(finalText || "")

    return NextResponse.json({ message: parsed.message, suggestions: parsed.suggestions ?? undefined })
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
