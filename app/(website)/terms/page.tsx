import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function TermsPage() {
  return (
    <div className="bg-gradient-to-b from-white to-slate-50">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="space-y-3">
            <p className="text-sm font-medium text-purple-700">Legal</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Terms of Service</h1>
            <p className="text-slate-600">Last updated: 28.10.2025</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>1. About VIAO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>
                VIAO is a platform for discovering and creating events and connecting with communities. By accessing or
                using our services, you agree to these Terms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Accounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <ul className="list-disc pl-5 space-y-2">
                <li>You are responsible for the accuracy of information you provide.</li>
                <li>Keep your login credentials secure.</li>
                <li>We may suspend accounts for abuse or unlawful use.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Events & Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <ul className="list-disc pl-5 space-y-2">
                <li>Organizers are responsible for event details, updates, and fulfillment.</li>
                <li>Do not post illegal, harmful, or misleading content.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>
                Your use of VIAO is also governed by our Privacy Policy. Please review it here: <Link href="/privacy" className="text-purple-700 hover:underline">/privacy</Link>
              </p>
            </CardContent>
          </Card>

          <Separator />

          <div className="rounded-lg border bg-white p-6">
            <p className="font-semibold">Questions?</p>
            <p className="mt-2 text-sm text-slate-600">
              If you have questions about these Terms, contact us at: <span className="font-medium text-slate-900">info@viao.ch</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
