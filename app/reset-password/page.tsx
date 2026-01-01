"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams?.get("token") || ""

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    if (!token) {
      setError("Reset link is missing or invalid.")
      setIsLoading(false)
      return
    }

    if (!password || password.length < 8) {
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
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "Failed to reset password.")
        toast.error(data.error || "Failed to reset password.")
        return
      }

      setSuccess("Your password has been reset. You can now sign in.")
      toast.success("Password updated. Redirecting to sign in...")
      setTimeout(() => router.push("/"), 1500)
    } catch (err) {
      setError("Something went wrong. Please try again.")
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl text-center">Reset your password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 text-gray-600">Loading...</div>}
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
