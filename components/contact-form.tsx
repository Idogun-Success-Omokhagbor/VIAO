"use client"

import { useState } from "react"
import { Loader2, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const contactTopics = [
  "General question",
  "Event organizer help",
  "Community or account issue",
  "Partnership or press",
] as const

type ContactFormState = {
  name: string
  email: string
  subject: string
  message: string
  website: string
}

const initialState: ContactFormState = {
  name: "",
  email: "",
  subject: contactTopics[0],
  message: "",
  website: "",
}

export function ContactForm() {
  const [form, setForm] = useState<ContactFormState>(initialState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function updateField<K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string; success?: boolean }

      if (!response.ok) {
        setError(payload.error || "We couldn't send your message right now.")
        return
      }

      setSuccess("Message sent. The team should get back to you within 48 hours.")
      setForm(initialState)
    } catch {
      setError("We couldn't send your message right now.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="contact-name" className="text-sm font-medium text-[#24154b]">
            Name
          </label>
          <Input
            id="contact-name"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Your name"
            className="h-12 rounded-2xl border-[#e7defe] bg-white/96 px-4 text-[#24154b] placeholder:text-[#9a8fc2]"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="contact-email" className="text-sm font-medium text-[#24154b]">
            Email
          </label>
          <Input
            id="contact-email"
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="you@example.com"
            className="h-12 rounded-2xl border-[#e7defe] bg-white/96 px-4 text-[#24154b] placeholder:text-[#9a8fc2]"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="contact-subject" className="text-sm font-medium text-[#24154b]">
          Topic
        </label>
        <select
          id="contact-subject"
          value={form.subject}
          onChange={(event) => updateField("subject", event.target.value)}
          className="flex h-12 w-full rounded-2xl border border-[#e7defe] bg-white/96 px-4 text-sm text-[#24154b] outline-none ring-offset-background focus:ring-2 focus:ring-[#cdbcff]"
        >
          {contactTopics.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
      </div>

      <div className="hidden">
        <label htmlFor="contact-website">Website</label>
        <Input
          id="contact-website"
          value={form.website}
          onChange={(event) => updateField("website", event.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="contact-message" className="text-sm font-medium text-[#24154b]">
          Message
        </label>
        <Textarea
          id="contact-message"
          value={form.message}
          onChange={(event) => updateField("message", event.target.value)}
          placeholder="Tell us what you need help with."
          className="min-h-40 rounded-[24px] border-[#e7defe] bg-white/96 px-4 py-3 text-[#24154b] placeholder:text-[#9a8fc2]"
          required
        />
      </div>

      {error ? <p className="rounded-2xl border border-[#ffd8e0] bg-[#fff6f8] px-4 py-3 text-sm text-[#b13053]">{error}</p> : null}
      {success ? (
        <p className="rounded-2xl border border-[#d8f5e8] bg-[#f5fffb] px-4 py-3 text-sm text-[#25795d]">{success}</p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-[#6a5f8f]">Questions from attendees, organizers, partners, and press all go through here.</p>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 rounded-full bg-[#7c5cff] px-6 text-white shadow-[0_14px_28px_rgba(124,92,255,0.28)] hover:bg-[#6c4ef7]"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {isSubmitting ? "Sending..." : "Send message"}
        </Button>
      </div>
    </form>
  )
}
