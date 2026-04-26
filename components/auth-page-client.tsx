"use client"

import Link from "next/link"
import { type ComponentType, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  CalendarCheck2,
  Compass,
  Eye,
  EyeOff,
  Heart,
  Lock,
  LogIn,
  Mail,
  Sparkles,
  User,
  UserRoundPlus,
  Users,
} from "lucide-react"

import { BrandLockup } from "@/components/brand-logo"
import { publicGlassCardClass, publicPillClass, publicSoftPanelClass } from "@/components/public-page-shell"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/auth-context"
import { VIAO_SANS_CLASS, VIAO_SERIF_CLASS } from "@/lib/font-stacks"
import { USER_INTEREST_OPTIONS } from "@/lib/user-interests"

type AuthPageClientProps = {
  mode: "signin" | "signup"
  allowSignups: boolean
}

type SignUpError = Error & {
  fieldErrors?: Record<string, string>
}

type Highlight = {
  icon: ComponentType<{ className?: string }>
  label: string
}

export function AuthPageClient({ mode, allowSignups }: AuthPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, signup } = useAuth()

  const nextParam = searchParams?.get("next") ?? null
  const [isLoading, setIsLoading] = useState(false)
  const [signInError, setSignInError] = useState<string | null>(null)
  const [signUpError, setSignUpError] = useState<string | null>(null)
  const [showSignInPassword, setShowSignInPassword] = useState(false)
  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false)
  const [signUpSubmitted, setSignUpSubmitted] = useState(false)
  const [signUpMismatch, setSignUpMismatch] = useState(false)
  const [signUpTooShort, setSignUpTooShort] = useState(false)
  const [signUpFieldErrors, setSignUpFieldErrors] = useState<Record<string, string>>({})

  const [signInData, setSignInData] = useState({
    email: searchParams?.get("email") ?? "",
    password: "",
  })

  const [signUpData, setSignUpData] = useState({
    name: "",
    email: searchParams?.get("email") ?? "",
    password: "",
    confirmPassword: "",
    userType: "USER" as "USER" | "ORGANIZER",
    interests: [] as string[],
    agreeToTerms: false,
  })

  const destination = useMemo(() => resolveNextPath(nextParam), [nextParam])

  const content = mode === "signin"
    ? {
        eyebrow: "Sign in",
        title: "Sign in and get back to your plans.",
        description: "Saved events, RSVPs, messages, and account details are waiting inside.",
        highlights: [
          { icon: CalendarCheck2, label: "Saved events stay put" },
          { icon: Heart, label: "Your shortlist stays with you" },
          { icon: Users, label: "RSVPs and messages stay ready" },
        ] satisfies Highlight[],
        asideTitle: "Inside your account",
        asideDescription: "The useful parts should still be right where you left them.",
        asideItems: [
          {
            icon: Compass,
            title: "Your feed",
            description: "Saved cities and activity stay tied to your account.",
          },
          {
            icon: CalendarCheck2,
            title: "Your actions",
            description: "Saved plans, RSVPs, and messages are ready when you return.",
          },
          {
            icon: Sparkles,
            title: "One clean return",
            description: "Sign in and keep moving without extra setup.",
          },
        ],
      }
    : {
        eyebrow: "Create account",
        title: "Create an account when a plan is worth keeping.",
        description: "Browse first. Join when you want to save, RSVP, message organizers, or keep your plans together.",
        highlights: [
          { icon: Heart, label: "Save events" },
          { icon: CalendarCheck2, label: "RSVP when it is a yes" },
          { icon: Users, label: "Message organizers" },
        ] satisfies Highlight[],
        asideTitle: "Why join",
        asideDescription: "An account should unlock something useful right away.",
        asideItems: [
          {
            icon: Heart,
            title: "Keep a shortlist",
            description: "Save the events you want to revisit.",
          },
          {
            icon: CalendarCheck2,
            title: "Track real plans",
            description: "RSVP and come back to the plans that matter.",
          },
          {
            icon: Users,
            title: "Stay connected",
            description: "Profiles, community, and messages start making sense once you join.",
          },
        ],
      }

  const signUpInvalidClass = (value?: string) =>
    signUpSubmitted && (!value || value.trim() === "") ? "border-[#ea6389] focus-visible:ring-[#ea6389]" : ""

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setSignInError(null)

    try {
      await login(signInData.email, signInData.password)
      router.replace(destination)
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : "Invalid credentials. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSignUpSubmitted(true)
    setSignUpError(null)
    setSignUpMismatch(false)
    setSignUpTooShort(false)
    setSignUpFieldErrors({})

    if (!allowSignups) {
      setSignUpError("Signups are currently disabled.")
      return
    }

    if (
      !signUpData.name.trim() ||
      !signUpData.email.trim() ||
      !signUpData.password.trim() ||
      !signUpData.confirmPassword.trim() ||
      !signUpData.agreeToTerms
    ) {
      setSignUpError("Please fill in the required fields.")
      return
    }

    if (signUpData.password.trim().length < 8) {
      setSignUpTooShort(true)
      setSignUpError("Password must be at least 8 characters.")
      return
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      setSignUpMismatch(true)
      setSignUpError("Passwords do not match.")
      return
    }

    setIsLoading(true)

    try {
      await signup(signUpData.name, signUpData.email, signUpData.password, signUpData.userType, signUpData.interests)
      router.replace(destination)
    } catch (error) {
      const fieldErrors = error instanceof Error && "fieldErrors" in error ? (error as SignUpError).fieldErrors : undefined
      if (fieldErrors) {
        setSignUpFieldErrors(fieldErrors)
      }
      setSignUpError(error instanceof Error ? error.message : "Failed to create account.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className={`${VIAO_SANS_CLASS} min-h-[100dvh] bg-[radial-gradient(circle_at_top_left,#f4efff,transparent_24%),radial-gradient(circle_at_bottom_right,#eef8ff,transparent_28%),linear-gradient(180deg,#ffffff,#faf7ff)] px-4 pb-14 pt-5 sm:px-6 sm:pb-16 sm:pt-6 lg:px-8 lg:pb-20`}
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 pt-0 sm:pt-2">
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
            <span className="hidden text-sm text-[#6a5f8f] sm:block">
              {mode === "signin" ? "New here?" : "Already have an account?"}
            </span>
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-full border-[#ddd1ff] bg-white/90 px-4 text-[#5e4ea6] hover:bg-[#f6f1ff]"
            >
              <Link href={mode === "signin" ? `/signup${buildNextQuery(nextParam)}` : `/signin${buildNextQuery(nextParam)}`}>
                {mode === "signin" ? <UserRoundPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                {mode === "signin" ? "Create account" : "Sign in"}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-full border-[#ddd1ff] bg-white/90 px-4 text-[#5e4ea6] hover:bg-[#f6f1ff]"
            >
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Back to homepage
              </Link>
            </Button>
          </div>
        </div>

        <div className={`${publicGlassCardClass} grid gap-6 overflow-visible px-5 py-6 sm:px-7 sm:py-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start lg:px-8`}>
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#887ab8]">{content.eyebrow}</p>
              <h1 className={`${VIAO_SERIF_CLASS} max-w-3xl text-4xl leading-[1.02] tracking-[-0.04em] text-[#24154b] sm:text-5xl lg:text-[4.35rem]`}>
                {content.title}
              </h1>
              <p className="max-w-2xl text-[17px] leading-8 text-[#6a5f8f] sm:text-lg">{content.description}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {content.highlights.map(({ icon: Icon, label }) => (
                <div key={label} className={`inline-flex items-center gap-2 ${publicPillClass}`}>
                  <Icon className="h-4 w-4 text-[#7c5cff]" />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {content.asideItems.map(({ icon: Icon, title, description }) => (
                <div key={title} className={`${publicSoftPanelClass} rounded-[24px] p-5`}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5f0ff] text-[#7c5cff]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold text-[#24154b]">{title}</h2>
                  <p className="mt-2 text-sm leading-7 text-[#6a5f8f]">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`${publicSoftPanelClass} self-start space-y-5 p-5 sm:p-6`}>
            <div className="flex gap-2 rounded-full border border-[#e7defe] bg-white/90 p-1">
              <Link
                href={`/signin${buildNextQuery(nextParam)}`}
                className={`flex-1 rounded-full px-4 py-3 text-center text-sm font-semibold transition-colors ${
                  mode === "signin" ? "bg-[#7c5cff] text-white shadow-[0_12px_24px_rgba(124,92,255,0.24)]" : "text-[#6a5f8f]"
                }`}
              >
                Sign in
              </Link>
              <Link
                href={`/signup${buildNextQuery(nextParam)}`}
                className={`flex-1 rounded-full px-4 py-3 text-center text-sm font-semibold transition-colors ${
                  mode === "signup" ? "bg-[#7c5cff] text-white shadow-[0_12px_24px_rgba(124,92,255,0.24)]" : "text-[#6a5f8f]"
                }`}
              >
                Create account
              </Link>
            </div>

            {mode === "signin" ? (
              <form onSubmit={handleSignIn} className="space-y-3">
                {signInError ? (
                  <p className="rounded-2xl border border-[#ffd8e0] bg-[#fff6f8] px-4 py-3 text-sm text-[#b13053]">{signInError}</p>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-sm font-medium text-[#24154b]">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-4 h-4 w-4 text-[#9185ba]" />
                    <Input
                      id="signin-email"
                      type="email"
                      autoComplete="email"
                      value={signInData.email}
                      onChange={(event) => setSignInData((current) => ({ ...current, email: event.target.value }))}
                      placeholder="you@example.com"
                      className="h-12 rounded-2xl border-[#e7defe] bg-white/96 pl-11 pr-4 text-[#24154b] placeholder:text-[#9a8fc2]"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-sm font-medium text-[#24154b]">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-4 h-4 w-4 text-[#9185ba]" />
                    <Input
                      id="signin-password"
                      type={showSignInPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={signInData.password}
                      onChange={(event) => setSignInData((current) => ({ ...current, password: event.target.value }))}
                      placeholder="Enter your password"
                      className="h-12 rounded-2xl border-[#e7defe] bg-white/96 pl-11 pr-11 text-[#24154b] placeholder:text-[#9a8fc2]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignInPassword((current) => !current)}
                      className="absolute right-4 top-4 text-[#9185ba]"
                    >
                      {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-[#7f73a8]">Use the same email tied to your account.</span>
                  <Link href={`/reset-password${buildEmailQuery(signInData.email, nextParam)}`} className="font-medium text-[#5f43e5] hover:text-[#4d32d6]">
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="h-12 w-full rounded-full bg-[#7c5cff] text-white shadow-[0_14px_28px_rgba(124,92,255,0.28)] hover:bg-[#6c4ef7]"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-3">
                {signUpError ? (
                  <p className="rounded-2xl border border-[#ffd8e0] bg-[#fff6f8] px-4 py-3 text-sm text-[#b13053]">{signUpError}</p>
                ) : null}
                {!allowSignups ? (
                  <p className="rounded-2xl border border-[#ffe8c9] bg-[#fff9ef] px-4 py-3 text-sm text-[#9d6518]">
                    Signups are currently disabled. You can still sign in if you already have an account.
                  </p>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm font-medium text-[#24154b]">
                      Full name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-4 h-4 w-4 text-[#9185ba]" />
                      <Input
                        id="signup-name"
                        autoComplete="name"
                        value={signUpData.name}
                        onChange={(event) => setSignUpData((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Your name"
                        className={`h-12 rounded-2xl border-[#e7defe] bg-white/96 pl-11 pr-4 text-[#24154b] placeholder:text-[#9a8fc2] ${signUpInvalidClass(signUpData.name)}`}
                        required
                      />
                    </div>
                    {signUpFieldErrors.name ? <p className="text-sm text-[#b13053]">{signUpFieldErrors.name}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium text-[#24154b]">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-4 h-4 w-4 text-[#9185ba]" />
                      <Input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        value={signUpData.email}
                        onChange={(event) => setSignUpData((current) => ({ ...current, email: event.target.value }))}
                        placeholder="you@example.com"
                        className={`h-12 rounded-2xl border-[#e7defe] bg-white/96 pl-11 pr-4 text-[#24154b] placeholder:text-[#9a8fc2] ${signUpInvalidClass(signUpData.email)}`}
                        required
                      />
                    </div>
                    {signUpFieldErrors.email ? <p className="text-sm text-[#b13053]">{signUpFieldErrors.email}</p> : null}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium text-[#24154b]">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 h-4 w-4 text-[#9185ba]" />
                      <Input
                        id="signup-password"
                        type={showSignUpPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={signUpData.password}
                        onChange={(event) => setSignUpData((current) => ({ ...current, password: event.target.value }))}
                        placeholder="Create a password"
                        className={`h-12 rounded-2xl border-[#e7defe] bg-white/96 pl-11 pr-11 text-[#24154b] placeholder:text-[#9a8fc2] ${signUpTooShort ? "border-[#ea6389] focus-visible:ring-[#ea6389]" : ""}`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword((current) => !current)}
                        className="absolute right-4 top-4 text-[#9185ba]"
                      >
                        {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {signUpFieldErrors.password ? <p className="text-sm text-[#b13053]">{signUpFieldErrors.password}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password" className="text-sm font-medium text-[#24154b]">
                      Confirm password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 h-4 w-4 text-[#9185ba]" />
                      <Input
                        id="signup-confirm-password"
                        type={showSignUpConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={signUpData.confirmPassword}
                        onChange={(event) => setSignUpData((current) => ({ ...current, confirmPassword: event.target.value }))}
                        placeholder="Confirm password"
                        className={`h-12 rounded-2xl border-[#e7defe] bg-white/96 pl-11 pr-11 text-[#24154b] placeholder:text-[#9a8fc2] ${signUpMismatch ? "border-[#ea6389] focus-visible:ring-[#ea6389]" : ""}`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpConfirmPassword((current) => !current)}
                        className="absolute right-4 top-4 text-[#9185ba]"
                      >
                        {showSignUpConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#24154b]">Account type</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {([
                      { value: "USER", label: "User", helper: "Browse, save, RSVP, and join the community." },
                      { value: "ORGANIZER", label: "Organizer", helper: "Create events, manage listings, and promote them." },
                    ] as const).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSignUpData((current) => ({ ...current, userType: option.value }))}
                        className={`rounded-full border px-4 py-3 text-left transition-all ${
                          signUpData.userType === option.value
                            ? "border-[#cdbdff] bg-[#f7f2ff] shadow-[0_12px_24px_rgba(124,92,255,0.12)]"
                            : "border-[#e7defe] bg-white"
                        }`}
                      >
                        <div className="text-sm font-semibold text-[#24154b]">{option.label}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-sm leading-6 text-[#6a5f8f]">
                    {signUpData.userType === "USER"
                      ? "Browse, save, RSVP, and join the community."
                      : "Create events, manage listings, and promote them."}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-[#24154b]">Interests</Label>
                  <div className="flex flex-wrap gap-2">
                    {USER_INTEREST_OPTIONS.map((interest) => {
                      const active = signUpData.interests.includes(interest)
                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() =>
                            setSignUpData((current) => ({
                              ...current,
                              interests: active
                                ? current.interests.filter((value) => value !== interest)
                                : [...current.interests, interest],
                            }))
                          }
                          className={`rounded-full border px-3 py-2 text-sm font-medium transition-all ${
                            active
                              ? "border-[#cdbdff] bg-[#f6f1ff] text-[#4f33d8]"
                              : "border-[#e8deff] bg-white text-[#5d5184] hover:border-[#cdbdff] hover:text-[#4f33d8]"
                          }`}
                        >
                          {interest}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-[22px] border border-[#ece4ff] bg-white/96 px-4 py-3">
                  <Checkbox
                    id="signup-terms"
                    checked={signUpData.agreeToTerms}
                    onCheckedChange={(checked) =>
                      setSignUpData((current) => ({ ...current, agreeToTerms: checked === true }))
                    }
                    className={signUpSubmitted && !signUpData.agreeToTerms ? "border-[#ea6389]" : ""}
                  />
                  <Label htmlFor="signup-terms" className="text-sm leading-7 text-[#6a5f8f]">
                    I agree to the{" "}
                    <Link href="/terms" className="font-medium text-[#5f43e5] hover:text-[#4d32d6]">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="font-medium text-[#5f43e5] hover:text-[#4d32d6]">
                      Privacy Policy
                    </Link>
                    .
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !allowSignups}
                  className="h-12 w-full rounded-full bg-[#7c5cff] text-white shadow-[0_14px_28px_rgba(124,92,255,0.28)] hover:bg-[#6c4ef7]"
                >
                  {isLoading ? "Creating account..." : "Create account"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function resolveNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/"
  }

  const normalized = next.split("?")[0] || next
  if (normalized === "/signin" || normalized === "/signup" || normalized === "/reset-password") {
    return "/"
  }

  return next
}

function buildNextQuery(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return ""
  }

  return `?next=${encodeURIComponent(next)}`
}

function buildEmailQuery(email: string, next: string | null) {
  const params = new URLSearchParams()
  if (email.trim()) {
    params.set("email", email.trim())
  }
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    params.set("next", next)
  }
  const query = params.toString()
  return query ? `?${query}` : ""
}
