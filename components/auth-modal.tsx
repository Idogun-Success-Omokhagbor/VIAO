"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Mail, Lock, User, MapPin, Calendar, Eye, EyeOff } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: "signin" | "signup"
}

export function AuthModal({ isOpen, onClose, initialTab = "signin" }: AuthModalProps) {
  const { login, signup } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [signInError, setSignInError] = useState<string | null>(null)
  const [signUpError, setSignUpError] = useState<string | null>(null)
  const [signInInvalidPassword, setSignInInvalidPassword] = useState(false)
  const [signInInvalidEmail, setSignInInvalidEmail] = useState(false)
  const [showSignInPassword, setShowSignInPassword] = useState(false)
  const [showSignUpPassword, setShowSignUpPassword] = useState(false)
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false)
  const [signUpSubmitted, setSignUpSubmitted] = useState(false)
  const [signUpMismatch, setSignUpMismatch] = useState(false)
  const [signUpTooShort, setSignUpTooShort] = useState(false)
  const [signUpFieldErrors, setSignUpFieldErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<"signin" | "signup">(initialTab)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetStep, setResetStep] = useState<"email" | "code" | "password">("email")
  const [resetCode, setResetCode] = useState("")
  const [resetNewPassword, setResetNewPassword] = useState("")
  const [resetConfirmPassword, setResetConfirmPassword] = useState("")
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const resetEmailError = resetStep === "email" ? resetError : null
  const signInPasswordError = signInInvalidPassword ? signInError : null
  const signInEmailError = signInInvalidEmail && !signInInvalidPassword ? signInError : null

  // Sign In Form State
  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  })

  // Sign Up Form State
  const [signUpData, setSignUpData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    userType: "USER" as "USER" | "ORGANIZER",
    location: "",
    interests: [] as string[],
    agreeToTerms: false,
  })

  const resetForgotState = () => {
    setForgotMode(false)
    setResetStep("email")
    setResetEmail("")
    setResetCode("")
    setResetNewPassword("")
    setResetConfirmPassword("")
    setShowResetPassword(false)
    setShowResetConfirmPassword(false)
    setResetError(null)
    setSignInInvalidEmail(false)
    setSignInInvalidPassword(false)
  }

  const handleClose = () => {
    resetForgotState()
    setSignInError(null)
    onClose()
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSignInError(null)
    setSignInInvalidPassword(false)
    setSignInInvalidEmail(false)

    try {
      await login(signInData.email, signInData.password)
      toast.success("Welcome back!")
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid credentials. Please try again."
      setSignInError(message)
      if (message.toLowerCase().includes("incorrect password")) {
        setSignInInvalidPassword(true)
      } else {
        setSignInInvalidPassword(true)
        setSignInInvalidEmail(true)
      }
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResetError(null)

    try {
      if (resetStep === "email") {
        if (!resetEmail.trim()) {
          toast.error("Please enter your email")
          setResetError("Please enter your email")
          return
        }
        const res = await fetch("/api/auth/password-reset/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: resetEmail }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          const message = data.error || "Invalid email"
          setResetError(message)
          toast.error(message)
          return
        }

        toast.success("If an account exists, we sent a 6-digit code.")
        setResetStep("code")
        return
      }

      if (resetStep === "code") {
        if (!resetCode.trim() || resetCode.trim().length < 6) {
          toast.error("Enter the 6-digit code we sent")
          setResetError("Enter the 6-digit code we sent")
          return
        }
        toast.success("Code verified")
        setResetStep("password")
        return
      }

      if (resetStep === "password") {
        if (resetNewPassword.trim().length < 6) {
          toast.error("Password must be at least 6 characters")
          setResetError("Password must be at least 6 characters")
          return
        }
        if (resetNewPassword !== resetConfirmPassword) {
          toast.error("Passwords don't match")
          setResetError("Passwords don't match")
          return
        }
        toast.success("Password updated. Please sign in.")
        setForgotMode(false)
        setActiveTab("signin")
        setSignInData({ email: resetEmail, password: "" })
        resetForgotState()
        return
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process request. Please try again."
      setResetError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const signUpInvalidClass = (value?: string) =>
    signUpSubmitted && (!value || (typeof value === "string" && value.trim() === ""))
      ? "border-red-500 focus-visible:ring-red-500"
      : ""
  const signUpMismatchClass = signUpMismatch ? "border-red-500 focus-visible:ring-red-500" : ""
  const signUpTooShortClass = signUpTooShort ? "border-red-500 focus-visible:ring-red-500" : ""

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSignUpError(null)
    setSignUpSubmitted(true)
    setSignUpMismatch(false)
    setSignUpTooShort(false)
    setSignUpFieldErrors({})

    if (
      !signUpData.name.trim() ||
      !signUpData.email.trim() ||
      !signUpData.password.trim() ||
      !signUpData.confirmPassword.trim() ||
      !signUpData.location.trim() ||
      !signUpData.agreeToTerms
    ) {
      toast.error("Please fill all required fields")
      setIsLoading(false)
      return
    }

    if (signUpData.password.trim().length < 8) {
      toast.error("Password must be at least 8 characters")
      setSignUpTooShort(true)
      setIsLoading(false)
      return
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      toast.error("Passwords don't match")
      setSignUpMismatch(true)
      setIsLoading(false)
      return
    }

    if (!signUpData.agreeToTerms) {
      toast.error("Please agree to the terms and conditions")
      setIsLoading(false)
      return
    }

    try {
      await signup(signUpData.name, signUpData.email, signUpData.password, signUpData.userType, signUpData.interests)
      toast.success("Account created successfully!")
      onClose()
    } catch (error) {
      const fieldErrors = (error as any)?.fieldErrors as Record<string, string> | undefined
      if (fieldErrors) {
        setSignUpFieldErrors(fieldErrors)
        const primaryMessage =
          fieldErrors.name || fieldErrors.email || fieldErrors.password || "Please fix the highlighted fields."
        setSignUpError(primaryMessage)
        toast.error(primaryMessage)
      } else {
        const message = error instanceof Error ? error.message : "Failed to create account. Please try again."
        setSignUpError(message)
        toast.error(message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleInterestToggle = (interest: string) => {
    setSignUpData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }))
  }

  const interests = [
    "Technology",
    "Art & Culture",
    "Music",
    "Sports",
    "Food & Drink",
    "Business",
    "Health & Wellness",
    "Education",
    "Travel",
    "Photography",
  ]

  if (!isOpen) return null

  const isSignup = activeTab === "signup"

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleClose}
    >
      <Card
        className={`w-full bg-white shadow-2xl ${
          isSignup ? "max-w-4xl max-h-[90vh] flex flex-col" : "max-w-md"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="relative">
          <Button variant="ghost" size="icon" onClick={handleClose} className="absolute right-2 top-2">
            <X className="h-4 w-4" />
          </Button>
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">V</span>
            </div>
          </div>
          <CardTitle className="text-center">Welcome to Viao</CardTitle>
          <CardDescription className="text-center">Join Switzerland's premier events community</CardDescription>
        </CardHeader>

        <CardContent className={isSignup ? "overflow-y-auto" : ""}>
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as "signin" | "signup")
              setForgotMode(false)
              setSignInError(null)
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4">
              {forgotMode ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {resetError && resetStep !== "email" && <p className="text-sm text-red-600 text-center">{resetError}</p>}

                  {resetStep === "email" && (
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="Enter your account email"
                          className={`pl-10 ${resetEmailError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                        />
                      </div>
                      {resetEmailError && <p className="text-sm text-red-600">{resetEmailError}</p>}
                    </div>
                  )}

                  {resetStep === "code" && (
                    <div className="space-y-2">
                      <Label htmlFor="reset-code">Reset code</Label>
                      <Input
                        id="reset-code"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="Enter 6-digit code"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">Demo-only: we assume the code is valid if it has 6 digits.</p>
                    </div>
                  )}

                  {resetStep === "password" && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="reset-new-password">New password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="reset-new-password"
                            type={showResetPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            className="pl-10 pr-10"
                            value={resetNewPassword}
                            onChange={(e) => setResetNewPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-2.5 text-muted-foreground"
                            onClick={() => setShowResetPassword((v) => !v)}
                          >
                            {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reset-confirm-password">Confirm new password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="reset-confirm-password"
                            type={showResetConfirmPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            className="pl-10 pr-10"
                            value={resetConfirmPassword}
                            onChange={(e) => setResetConfirmPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-2.5 text-muted-foreground"
                            onClick={() => setShowResetConfirmPassword((v) => !v)}
                          >
                            {showResetConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading
                      ? resetStep === "email"
                        ? "Sending code..."
                        : resetStep === "code"
                        ? "Verifying..."
                        : "Updating..."
                      : resetStep === "email"
                      ? "Send Code"
                      : resetStep === "code"
                      ? "Verify Code"
                      : "Update Password"}
                  </Button>

                  <div className="text-center">
                    <Button
                      variant="link"
                      className="text-sm"
                      type="button"
                      onClick={() => {
                        resetForgotState()
                        setSignInError(null)
                      }}
                    >
                      Back to Sign In
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="Enter your email"
                          className={`pl-10 ${signInInvalidEmail ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          value={signInData.email}
                          onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                          required
                        />
                      </div>
                      {signInEmailError && <p className="text-sm text-red-600">{signInEmailError}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signin-password"
                          type={showSignInPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          className={`pl-10 pr-10 ${
                            signInInvalidPassword ? "border-red-500 focus-visible:ring-red-500" : ""
                          }`}
                          value={signInData.password}
                          onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-2.5 text-muted-foreground"
                          onClick={() => setShowSignInPassword((v) => !v)}
                        >
                          {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {signInPasswordError && <p className="text-sm text-red-600">{signInPasswordError}</p>}
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Signing In..." : "Sign In"}
                    </Button>
                  </form>

                  <div className="text-center">
                    <Button
                      variant="link"
                      className="text-sm"
                      type="button"
                      onClick={() => {
                        setForgotMode(true)
                        setResetStep("email")
                        setResetEmail(signInData.email)
                        setSignInError(null)
                        setResetError(null)
                      }}
                    >
                      Forgot your password?
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              {signUpError && <p className="text-sm text-red-600">{signUpError}</p>}
              <form onSubmit={handleSignUp} className="space-y-4 md:space-y-2">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your full name"
                      className={`pl-10 ${signUpInvalidClass(signUpData.name)} ${
                        signUpFieldErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""
                      }`}
                      value={signUpData.name}
                      onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                      required
                    />
                  </div>
                  {signUpFieldErrors.name && <p className="text-sm text-red-600">{signUpFieldErrors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      className={`pl-10 ${signUpInvalidClass(signUpData.email)} ${
                        signUpFieldErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""
                      }`}
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      required
                    />
                  </div>
                  {signUpFieldErrors.email && <p className="text-sm text-red-600">{signUpFieldErrors.email}</p>}
                </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type={showSignUpPassword ? "text" : "password"}
                      placeholder="Create a password"
                      className={`pl-10 pr-10 ${signUpInvalidClass(signUpData.password)} ${signUpMismatchClass} ${signUpTooShortClass} ${
                        signUpFieldErrors.password ? "border-red-500 focus-visible:ring-red-500" : ""
                      }`}
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      required
                    />
                      <button
                        type="button"
                        className="absolute right-3 top-2.5 text-muted-foreground"
                        onClick={() => setShowSignUpPassword((v) => !v)}
                      >
                        {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showSignUpConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      className={`pl-10 pr-10 ${signUpInvalidClass(signUpData.confirmPassword)} ${signUpMismatchClass}`}
                      value={signUpData.confirmPassword}
                      onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                      required
                    />
                      <button
                        type="button"
                        className="absolute right-3 top-2.5 text-muted-foreground"
                        onClick={() => setShowSignUpConfirmPassword((v) => !v)}
                      >
                        {showSignUpConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {signUpTooShort && <p className="text-sm text-red-600">Password must be at least 8 characters</p>}
                    {signUpMismatch && <p className="text-sm text-red-600">Passwords don't match</p>}
                    {signUpFieldErrors.password && <p className="text-sm text-red-600">{signUpFieldErrors.password}</p>}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-location">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-location"
                        type="text"
                        placeholder="e.g., Zurich, Switzerland"
                        className={`pl-10 ${signUpInvalidClass(signUpData.location)}`}
                        value={signUpData.location}
                        onChange={(e) => setSignUpData({ ...signUpData, location: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>User Type</Label>
                    <Select
                      value={signUpData.userType}
                      onValueChange={(value: "USER" | "ORGANIZER") => setSignUpData({ ...signUpData, userType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER">User</SelectItem>
                        <SelectItem value="ORGANIZER">Organizer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Interests (optional)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {interests.map((interest) => (
                      <label key={interest} className="flex items-center space-x-2 text-sm">
                        <Checkbox
                          checked={signUpData.interests.includes(interest)}
                          onCheckedChange={() => handleInterestToggle(interest)}
                        />
                        <span>{interest}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={signUpData.agreeToTerms}
                    onCheckedChange={(checked) => setSignUpData({ ...signUpData, agreeToTerms: checked as boolean })}
                    className={signUpSubmitted && !signUpData.agreeToTerms ? "border-red-500" : ""}
                  />
                  <Label htmlFor="terms" className={`text-sm ${signUpSubmitted && !signUpData.agreeToTerms ? "text-red-600" : ""}`}>
                    I agree to the{" "}
                    <Button variant="link" className="p-0 h-auto text-sm">
                      Terms of Service
                    </Button>{" "}
                    and{" "}
                    <Button variant="link" className="p-0 h-auto text-sm">
                      Privacy Policy
                    </Button>
                  </Label>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default AuthModal
