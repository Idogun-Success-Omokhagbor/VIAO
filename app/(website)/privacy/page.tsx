import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function PrivacyPage() {
  return (
    <div className="bg-gradient-to-b from-white to-slate-50">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="space-y-3">
            <p className="text-sm font-medium text-purple-700">Privacy</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy for VIAO</h1>
            <p className="text-slate-600">Effective Date: 28.10.2025</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <p>
                VIAO ("we," "our," "us") respects your privacy and is committed to protecting your personal data.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <ul className="list-disc pl-5 space-y-2">
                <li>Location data (to find local events)</li>
                <li>Account details (email, name, preferences)</li>
                <li>App usage data (to improve recommendations)</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How We Use Your Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <ul className="list-disc pl-5 space-y-2">
                <li>Provide personalized event suggestions</li>
                <li>Improve app performance</li>
                <li>Communicate updates and important notifications</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Sharing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>We do not sell your data.</p>
              <p>We may share limited data with trusted service providers (hosting, analytics).</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Rights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <ul className="list-disc pl-5 space-y-2">
                <li>Access, update, or delete your data anytime.</li>
                <li>Opt out of marketing emails.</li>
              </ul>
            </CardContent>
          </Card>

          <Separator />

          <div className="rounded-lg border bg-white p-6">
            <p className="font-semibold">Contact</p>
            <p className="mt-2 text-sm text-slate-600">
              For privacy concerns, contact us at: <span className="font-medium text-slate-900">info@viao.ch</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
