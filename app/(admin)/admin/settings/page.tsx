"use client"

import { useEffect, useState } from "react"
import { RefreshCcw, Save } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

type AdminSettings = {
  siteName?: string
  supportEmail?: string
  allowSignups?: boolean
  maintenanceMode?: boolean
  announcement?: string
  stripeEnabled?: boolean
}

type SettingsResponse = {
  settings: AdminSettings
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = async () => {
    setIsLoading(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch("/api/admin/settings", { credentials: "include", cache: "no-store" })
      const json = (await res.json().catch(() => null)) as any
      if (!res.ok) throw new Error(json?.error || "Failed to load settings")
      const payload = json as SettingsResponse
      setSettings(payload.settings || {})
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const save = async () => {
    setIsSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      })
      const json = (await res.json().catch(() => null)) as any
      if (!res.ok) throw new Error(json?.error || "Failed to save settings")
      setSettings((json as any)?.settings || settings)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Site Configuration</h1>
          <p className="text-sm text-muted-foreground">Control site behavior and announcements.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={load} disabled={isLoading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reload
          </Button>
          <Button onClick={save} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>
      )}
      {saved && !error && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700">Saved.</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site name</Label>
              <Input
                id="siteName"
                value={settings.siteName ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, siteName: e.target.value }))}
                placeholder="Viao"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={settings.supportEmail ?? ""}
                onChange={(e) => setSettings((s) => ({ ...s, supportEmail: e.target.value }))}
                placeholder="support@viao.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="announcement">Announcement</Label>
            <Textarea
              id="announcement"
              value={settings.announcement ?? ""}
              onChange={(e) => setSettings((s) => ({ ...s, announcement: e.target.value }))}
              placeholder="Optional message shown to users."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div>
              <div className="font-medium">Allow new signups</div>
              <div className="text-sm text-muted-foreground">Disable to prevent creating new accounts.</div>
            </div>
            <Switch
              checked={Boolean(settings.allowSignups)}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, allowSignups: Boolean(v) }))}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div>
              <div className="font-medium">Maintenance mode</div>
              <div className="text-sm text-muted-foreground">Show a maintenance message (UI only; you can hook middleware later).</div>
            </div>
            <Switch
              checked={Boolean(settings.maintenanceMode)}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, maintenanceMode: Boolean(v) }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div>
              <div className="font-medium">Stripe features enabled</div>
              <div className="text-sm text-muted-foreground">Toggle UI-level visibility of billing-related features.</div>
            </div>
            <Switch
              checked={Boolean(settings.stripeEnabled)}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, stripeEnabled: Boolean(v) }))}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
