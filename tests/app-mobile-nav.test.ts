import assert from "node:assert/strict"
import test from "node:test"

import { getNavItems } from "../components/app-mobile-nav"

test("user mobile nav keeps discover, plans, and messages as the primary tabs", () => {
  const items = getNavItems("USER")

  assert.deepEqual(
    items.map((item) => item.label),
    ["Discover", "Plans", "Messages", "Account"],
  )
  assert.equal(items[1]?.href, "/my-events")
  assert.equal(items[1]?.match("/my-events"), true)
})

test("organizer mobile nav keeps event workspace entry", () => {
  const items = getNavItems("ORGANIZER")

  assert.equal(items[0]?.label, "Events")
  assert.equal(items[0]?.href, "/events")
  assert.equal(items[0]?.match("/receipts"), true)
})
