import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default function SupportPage() {
  return (
    <div className="bg-gradient-to-b from-white to-slate-50">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="space-y-3">
            <p className="text-sm font-medium text-purple-700">VIAO Support</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Welcome to VIAO Support! 💬</h1>
            <p className="text-slate-600">Need help? We’re here for you.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>📩 Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div>
                <span className="font-medium text-slate-900">Email:</span> info@viao.ch
              </div>
              <div>
                <span className="font-medium text-slate-900">Response time:</span> within 48 hours
              </div>
              <div className="pt-2">
                <Button asChild className="bg-purple-600 hover:bg-purple-700">
                  <a href="mailto:info@viao.ch?subject=VIAO%20Support">Contact Support</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>❓ FAQs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="space-y-1">
                <p className="font-medium text-slate-900">Can’t find local events?</p>
                <p>Try updating your location settings in the app.</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="font-medium text-slate-900">App not working as expected?</p>
                <p>Restart the app or reinstall to ensure you have the latest version.</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="font-medium text-slate-900">Need more help?</p>
                <p>Just drop us a message, and our team will get back to you.</p>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-lg border bg-white p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="font-semibold">Still stuck?</p>
                <p className="text-sm text-slate-600">Send us a message and we’ll help you out.</p>
              </div>
              <div className="flex gap-3">
                <Button asChild variant="outline">
                  <a href="mailto:info@viao.ch?subject=VIAO%20Support">Email Support</a>
                </Button>
                <Button asChild className="bg-purple-600 hover:bg-purple-700">
                  <Link href="/contact">Open Contact Page</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
