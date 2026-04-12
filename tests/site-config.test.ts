import assert from "node:assert/strict"
import test from "node:test"

import { mergeSiteConfigPreferences, parseSiteConfigSettings } from "../lib/site-config-settings"

test("parseSiteConfigSettings returns sanitized admin settings only", () => {
  const parsed = parseSiteConfigSettings({
    adminSettings: {
      siteName: "Viao",
      supportEmail: "support@viao.com",
      allowSignups: true,
      maintenanceMode: false,
      stripeEnabled: true,
      announcement: "Live now",
      unknown: "ignored",
    },
    theme: "midnight",
  })

  assert.deepEqual(parsed, {
    siteName: "Viao",
    supportEmail: "support@viao.com",
    allowSignups: true,
    maintenanceMode: false,
    stripeEnabled: true,
    announcement: "Live now",
  })
})

test("parseSiteConfigSettings falls back safely for malformed values", () => {
  assert.deepEqual(parseSiteConfigSettings(null), {})
  assert.deepEqual(parseSiteConfigSettings({ adminSettings: { supportEmail: "not-an-email" } }), {})
  assert.deepEqual(parseSiteConfigSettings({ random: true }), {})
})

test("mergeSiteConfigPreferences preserves unrelated preferences", () => {
  const merged = mergeSiteConfigPreferences(
    {
      theme: "violet",
      notifications: { marketing: false },
      adminSettings: { siteName: "Old name" },
    },
    {
      siteName: "New name",
      allowSignups: false,
    },
  )

  assert.deepEqual(merged, {
    theme: "violet",
    notifications: { marketing: false },
    adminSettings: {
      siteName: "New name",
      allowSignups: false,
    },
  })
})
