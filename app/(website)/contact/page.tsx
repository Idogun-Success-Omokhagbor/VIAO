import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

export default function ContactPage() {
  return (
    <div className="bg-gradient-to-b from-white to-slate-50">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="space-y-3">
            <p className="text-sm font-medium text-purple-700">Contact</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Get in touch</h1>
            <p className="text-slate-600">Send us a message and we’ll get back to you.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Contact VIAO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-white p-4 text-sm text-slate-600">
                <div>
                  <span className="font-medium text-slate-900">Email:</span> info@viao.ch
                </div>
                <div className="mt-1">
                  <span className="font-medium text-slate-900">Typical response time:</span> within 48 hours
                </div>
              </div>

              <form action="mailto:info@viao.ch" method="post" encType="text/plain" className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input name="name" placeholder="Your name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input name="email" type="email" placeholder="you@example.com" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <Textarea name="message" placeholder="How can we help?" className="min-h-32" />
                </div>

                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  Send Message
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
