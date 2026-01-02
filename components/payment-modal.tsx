"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Zap, Crown, Check } from "lucide-react"

type SiteConfig = {
  stripeEnabled?: boolean
}

type SiteConfigResponse = {
  config?: SiteConfig
  error?: string
}

function getErrorMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined
  const msg = (payload as { error?: unknown }).error
  return typeof msg === "string" ? msg : undefined
}

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventTitle: string
  boostLevel: number
}

export default function PaymentModal({ isOpen, onClose, eventId, eventTitle, boostLevel }: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<1 | 2>(boostLevel === 2 ? 2 : 1)
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch("/api/site-config", { cache: "no-store", credentials: "include" })
        const json = (await res.json().catch(() => null)) as unknown
        if (!res.ok) throw new Error(getErrorMessage(json) || "Failed to load site configuration")
        const data = (json && typeof json === "object" ? (json as SiteConfigResponse) : null)?.config
        if (!cancelled) setSiteConfig(data ?? null)
      } catch {
        if (!cancelled) setSiteConfig(null)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [isOpen])

  if (!isOpen) return null

  const effectiveLevel: 1 | 2 = boostLevel === 0 ? selectedLevel : boostLevel === 2 ? 2 : 1
  const boostPrice = effectiveLevel === 1 ? 5 : 15
  const boostName = effectiveLevel === 1 ? "Basic Boost" : "Premium Boost"

  const boostingEnabled = siteConfig?.stripeEnabled !== false

  const handlePayment = async () => {
    if (!eventId) return
    if (!boostingEnabled) return
    setIsProcessing(true)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ eventId, level: effectiveLevel }),
      })
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Failed to start checkout")
      }
      window.location.assign(data.url)
    } catch {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-white">
        <CardHeader className="relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>

          <CardTitle className="flex items-center gap-2">
            {effectiveLevel === 1 ? (
              <Zap className="h-5 w-5 text-blue-600" />
            ) : (
              <Crown className="h-5 w-5 text-purple-600" />
            )}
            Boost Your Event
          </CardTitle>

          <div className="text-sm text-gray-600">
            <p className="font-medium truncate">{eventTitle}</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Boost Plan Details */}
          {boostLevel === 0 ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-700 font-medium">Choose a boost plan</div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={selectedLevel === 1 ? "default" : "outline"}
                  onClick={() => setSelectedLevel(1)}
                  disabled={isProcessing}
                >
                  Basic
                </Button>
                <Button
                  type="button"
                  variant={selectedLevel === 2 ? "default" : "outline"}
                  onClick={() => setSelectedLevel(2)}
                  disabled={isProcessing}
                >
                  Premium
                </Button>
              </div>
            </div>
          ) : null}

          <div
            className={`border-2 rounded-lg p-4 ${
              effectiveLevel === 1 ? "border-blue-200 bg-blue-50" : "border-purple-200 bg-purple-50"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {effectiveLevel === 1 ? (
                  <Zap className="h-5 w-5 text-blue-600" />
                ) : (
                  <Crown className="h-5 w-5 text-purple-600" />
                )}
                <span className="font-semibold">{boostName}</span>
              </div>
              <Badge variant="secondary" className="font-bold">
                CHF {boostPrice}
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              {effectiveLevel === 1 ? (
                <>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Featured in search results</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Boost badge on event card</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>24 hours of promotion</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Top placement in all listings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Premium boost badge</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>72 hours of promotion</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Social media promotion</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>Email newsletter inclusion</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment Method */}
          <div className="text-sm text-gray-600">
            You will be redirected to Stripe Checkout to complete payment securely.
          </div>

          {!boostingEnabled ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Boosting is currently disabled by the site administrator.
            </div>
          ) : null}

          {/* Payment Form */}
          <div />

          {/* Payment Summary */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold">CHF {boostPrice}</span>
            </div>

            <Button
              onClick={handlePayment}
              disabled={isProcessing || !boostingEnabled}
              className={`w-full ${
                effectiveLevel === 1 ? "bg-blue-600 hover:bg-blue-700" : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                `Continue to Stripe (CHF ${boostPrice})`
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Your event will be boosted immediately after payment confirmation. Boost duration starts from the time of
            payment.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
