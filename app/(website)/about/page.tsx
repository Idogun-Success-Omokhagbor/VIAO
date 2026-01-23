import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function AboutPage() {
  return (
    <div className="bg-gradient-to-b from-white to-slate-50">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl space-y-10">
          <div className="space-y-3">
            <p className="text-sm font-medium text-purple-700">About VIAO</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Discover events. Build community. Make moments.</h1>
            <p className="text-slate-600">
              VIAO helps you find what’s happening near you and connect with people who share your interests.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Our Mission</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                Make it effortless to discover local experiences and create meaningful connections.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>For Attendees</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                Browse events, save favorites, and stay in the loop with updates and reminders.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>For Communities</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600">
                Meet people, message safely, and grow your circles around the things you love.
              </CardContent>
            </Card>
          </div>

          <div className="rounded-xl border bg-white p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-lg font-semibold">Want to get in touch?</p>
                <p className="text-sm text-slate-600">We’d love to hear from you.</p>
              </div>
              <div className="flex gap-3">
                <Button asChild variant="outline">
                  <Link href="/support">Support</Link>
                </Button>
                <Button asChild className="bg-purple-600 hover:bg-purple-700">
                  <Link href="/contact">Contact</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
