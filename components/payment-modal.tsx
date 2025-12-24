"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { X, CreditCard, Zap, Crown, Check } from "lucide-react"

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  eventTitle: string
  boostLevel: 1 | 2
  onPaymentSuccess: () => void
}

export default function PaymentModal({ isOpen, onClose, eventTitle, boostLevel, onPaymentSuccess }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState("card")
  const [isProcessing, setIsProcessing] = useState(false)
  const [cardNumber, setCardNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [cardName, setCardName] = useState("")

  if (!isOpen) return null

  const boostPrice = boostLevel === 1 ? 5 : 15
  const boostName = boostLevel === 1 ? "Basic Boost" : "Premium Boost"
  const boostIcon = boostLevel === 1 ? Zap : Crown
  const boostColor = boostLevel === 1 ? "blue" : "purple"

  const handlePayment = async () => {
    setIsProcessing(true)

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsProcessing(false)
    onPaymentSuccess()
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(" ")
    } else {
      return v
    }
  }

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4)
    }
    return v
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-white">
        <CardHeader className="relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>

          <CardTitle className="flex items-center gap-2">
            {boostLevel === 1 ? (
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
          <div
            className={`border-2 rounded-lg p-4 ${
              boostLevel === 1 ? "border-blue-200 bg-blue-50" : "border-purple-200 bg-purple-50"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {boostLevel === 1 ? (
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
              {boostLevel === 1 ? (
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
          <div>
            <Label className="text-base font-semibold">Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Credit Card
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paypal" id="paypal" />
                <Label htmlFor="paypal" className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold">
                    P
                  </div>
                  PayPal
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Payment Form */}
          {paymentMethod === "card" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                    maxLength={5}
                  />
                </div>
                <div>
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").substring(0, 3))}
                    maxLength={3}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cardName">Cardholder Name</Label>
                <Input
                  id="cardName"
                  placeholder="John Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Payment Summary */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold">CHF {boostPrice}</span>
            </div>

            <Button
              onClick={handlePayment}
              disabled={isProcessing}
              className={`w-full ${
                boostLevel === 1 ? "bg-blue-600 hover:bg-blue-700" : "bg-purple-600 hover:bg-purple-700"
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                `Boost Event for CHF ${boostPrice}`
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
