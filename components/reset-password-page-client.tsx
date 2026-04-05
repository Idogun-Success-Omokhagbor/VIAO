"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DM_Sans, DM_Serif_Display } from "next/font/google"
import { ArrowLeft, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react"

import { BrandLockup } from "@/components/brand-logo"
import { publicGlassCardClass, publicPillClass, publicSoftPanelClass } from "@/components/public-page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
})

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
})

export function ResetPasswordPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams?.get("next") ?? null
  const initialEmail = searchParams?.get("email") ?? ""

  const [step, setStep] = useState<"email" | "code" | "password">("email")
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  async function sendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        setError(payload.error || "Unable to send reset code.")
        return
      }

      setSuccess("If an account exists, a 6-digit reset code has been sent.")
      setStep("code")
    } catch {
      setError("Unable to send reset code.")
    } finally {
      setIsLoading(false)
    }
  }

  async function verifyCode() {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        setError(payload.error || "Invalid or expired code.")
        return
      }

      setSuccess("Code verified. Choose the new password.")
      setStep("password")
    } catch {
      setError("Unable to verify code.")
    } finally {
      setIsLoading(false)
    }
  }

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    if (password.trim().length < 8) {
      setError("Password must be at least 8 characters.")
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        setError(payload.error || "Unable to reset password.")
        return
      }

      setSuccess("Password updated. Redirecting to sign in...")
      const params = new URLSearchParams()
      params.set("email", email)
      if (next && next.startsWith("/") && !next.startsWith("//")) {
        params.set("next", next)
      }
      setTimeout(() => {
        router.replace(`/signin?${params.toString()}`)
      }, 1200)
    } catch {
      setError("Unable to reset password.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={`${dmSans.className} min-h-screen bg-[radial-gradient(circle_at_top_left,#f4efff,transparent_24%),radial-gradient(circle_at_bottom_right,#eef8ff,transparent_28%),linear-gradient(180deg,#ffffff,#faf7ff)] px-4 py-8 sm:px-6 lg:px-8`}
    >
      <div className="mx-auto flex max-w-[1160px] flex-col gap-8 pt-2 sm:pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3 text-[#24154b] no-underline">
            <BrandLockup
              iconSize={40}
              titleClassName="text-xl font-semibold text-[#24154b]"
              subtitle="Local experiences"
              subtitleClassName="text-[#8a7ab6]"
            />
          </Link>

          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-full border-[#ddd1ff] bg-white/90 px-5 text-[#5e4ea6] hover:bg-[#f6f1ff]"
            >
              <Link href={`/signin${buildNextQuery(next)}`}>
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </Button>
          </div>
        </div>

        <div className={`${publicGlassCardClass} grid gap-8 overflow-hidden px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_440px] lg:px-10`}>
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#887ab8]">Reset password</p>
              <h1 className={`${dmSerif.className} max-w-3xl text-4xl leading-[1.02] tracking-[-0.04em] text-[#24154b] sm:text-5xl lg:text-[4.35rem]`}>
                Reset access without leaving the product flow.
              </h1>
              <p className="max-w-2xl text-[17px] leading-8 text-[#6a5f8f] sm:text-lg">
                Enter the account email, verify the 6-digit code from the inbox, and choose a new password without getting bounced around.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className={publicPillClass}>6-digit code</div>
              <div className={publicPillClass}>Password minimum: 8 characters</div>
              <div className={publicPillClass}>Redirects back to sign in</div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className={`${publicSoftPanelClass} rounded-[24px] p-5`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5f0ff] text-[#7c5cff]">
                  <Mail className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-[#24154b]">Step 1: send the code</h2>
                <p className="mt-2 text-sm leading-7 text-[#6a5f8f]">Use the same email tied to the account so the reset code goes to the right inbox.</p>
              </div>
              <div className={`${publicSoftPanelClass} rounded-[24px] p-5`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5f0ff] text-[#7c5cff]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-[#24154b]">Step 2: verify and update</h2>
                <p className="mt-2 text-sm leading-7 text-[#6a5f8f]">Once the code is confirmed, choose a new password and head straight back to sign in.</p>
              </div>
            </div>
          </div>

          <div className={`${publicSoftPanelClass} space-y-5 p-6 sm:p-7`}>
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f0ff] text-[#7c5cff]">
                <KeyRound className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#24154b]">
                  {step === "email" ? "Send reset code" : step === "code" ? "Verify the code" : "Choose a new password"}
                </h2>
                <p className="mt-2 text-sm leading-7 text-[#6a5f8f]">
                  {step === "email"
                    ? "Start by entering the account email."
                    : step === "code"
                      ? "Open the email, copy the 6-digit code, and confirm it here."
                      : "Enter the new password twice so the update is deliberate and clear."}
                </p>
              </div>
            </div>

            {error ? <p className="rounded-2xl border border-[#ffd8e0] bg-[#fff6f8] px-4 py-3 text-sm text-[#b13053]">{error}</p> : null}
            {success ? <p className="rounded-2xl border border-[#d8f5e8] bg-[#f5fffb] px-4 py-3 text-sm text-[#25795d]">{success}</p> : null}

            {step === "email" ? (
              <form onSubmit={sendCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-sm font-medium text-[#24154b]">
                    Account email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-4 h-4 w-4 text-[#9185ba]" />
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="h-12 rounded-2xl border-[#e7defe] bg-white/96 pl-11 pr-4 text-[#24154b] placeholder:text-[#9a8fc2]"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={isLoading} className="h-12 w-full rounded-full bg-[#7c5cff] text-white hover:bg-[#6c4ef7]">
                  {isLoading ? "Sending code..." : "Send reset code"}
                </Button>
              </form>
            ) : null}

            {step === "code" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-code" className="text-sm font-medium text-[#24154b]">
                    6-digit code
                  </Label>
                  <Input
                    id="reset-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="123456"
                    className="h-12 rounded-2xl border-[#e7defe] bg-white/96 px-4 text-[#24154b] placeholder:text-[#9a8fc2]"
                    required
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="button" disabled={isLoading} onClick={verifyCode} className="h-12 flex-1 rounded-full bg-[#7c5cff] text-white hover:bg-[#6c4ef7]">
                    {isLoading ? "Verifying..." : "Verify code"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setStep("email")} className="h-12 flex-1 rounded-full border-[#ddd1ff] text-[#5e4ea6] hover:bg-[#f6f1ff]">
                    Change email
                  </Button>
                </div>
              </div>
            ) : null}

            {step === "password" ? (
              <form onSubmit={updatePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-password" className="text-sm font-medium text-[#24154b]">
                    New password
                  </Label>
                  <div className="relative">
                    <Input
                      id="reset-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Create a new password"
                      className="h-12 rounded-2xl border-[#e7defe] bg-white/96 px-4 pr-11 text-[#24154b] placeholder:text-[#9a8fc2]"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-4 top-4 text-[#9185ba]">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-confirm-password" className="text-sm font-medium text-[#24154b]">
                    Confirm new password
                  </Label>
                  <div className="relative">
                    <Input
                      id="reset-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Confirm the password"
                      className="h-12 rounded-2xl border-[#e7defe] bg-white/96 px-4 pr-11 text-[#24154b] placeholder:text-[#9a8fc2]"
                      required
                    />
                    <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} className="absolute right-4 top-4 text-[#9185ba]">
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={isLoading} className="h-12 w-full rounded-full bg-[#7c5cff] text-white hover:bg-[#6c4ef7]">
                  {isLoading ? "Updating password..." : "Update password"}
                </Button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function buildNextQuery(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return ""
  }

  return `?next=${encodeURIComponent(next)}`
}
