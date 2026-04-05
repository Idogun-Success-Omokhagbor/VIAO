import assert from "node:assert/strict"
import test from "node:test"

import { formatBoostCountdown, getBoostCountdownToneClass } from "../lib/utils"

test("formatBoostCountdown returns compact hour and minute labels", () => {
  const now = new Date("2026-04-02T12:00:00Z").getTime()

  assert.equal(formatBoostCountdown("2026-04-02T15:30:00Z", now), "3h 30m")
  assert.equal(formatBoostCountdown("2026-04-02T12:45:00Z", now), "45m")
  assert.equal(formatBoostCountdown("2026-04-02T10:00:00Z", now), null)
})

test("getBoostCountdownToneClass reflects remaining boost time", () => {
  const now = new Date("2026-04-02T12:00:00Z").getTime()

  assert.equal(getBoostCountdownToneClass("2026-04-04T00:30:00Z", now), "bg-emerald-600 text-white")
  assert.equal(getBoostCountdownToneClass("2026-04-03T06:30:00Z", now), "bg-amber-400 text-amber-950")
  assert.equal(getBoostCountdownToneClass("2026-04-02T18:00:00Z", now), "bg-red-600 text-white")
  assert.equal(getBoostCountdownToneClass(null, now), "bg-white/90 text-gray-900")
})
