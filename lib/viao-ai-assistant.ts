interface AIResponse {
  message: string
  suggestions?: string[]
}

type AIHistoryItem = { role: "user" | "assistant"; content: string }

async function requestAI(message: string, history: AIHistoryItem[] = []): Promise<AIResponse> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ message, history }),
  })

  const data = (await res.json().catch(() => null)) as { message?: string; suggestions?: string[]; error?: string } | null

  if (!res.ok) {
    throw new Error(data?.error || "AI request failed")
  }

  return {
    message: data?.message || "",
    suggestions: Array.isArray(data?.suggestions) ? data.suggestions : undefined,
  }
}

export class ViaoAIAssistant {
  public async processQuery(query: string): Promise<AIResponse> {
    return requestAI(query)
  }
}

export async function getViaoAIResponse(query: string): Promise<AIResponse> {
  return requestAI(query)
}

export async function getViaoAIResponseWithHistory(query: string, history?: AIHistoryItem[]): Promise<AIResponse> {
  return requestAI(query, Array.isArray(history) ? history : [])
}

export async function viaoAI(query: string): Promise<string> {
  const response = await getViaoAIResponse(query)
  return response.message
}
