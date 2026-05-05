import assert from "node:assert/strict"
import test from "node:test"

import { getNavItems } from "../lib/app-nav"

test("user mobile nav includes community alongside the primary signed-in tabs", () => {
  const items = getNavItems("USER")

  assert.deepEqual(
    items.map((item) => item.label),
    ["Discover", "Plans", "Community", "Messages", "Account"],
  )
  assert.equal(items[1]?.href, "/my-events")
  assert.equal(items[1]?.match("/my-events"), true)
  assert.equal(items[2]?.href, "/community")
  assert.equal(items[2]?.match("/community"), true)
})

test("organizer mobile nav keeps event workspace entry and exposes community", () => {
  const items = getNavItems("ORGANIZER")

  assert.equal(items[0]?.label, "Events")
  assert.equal(items[0]?.href, "/events")
  assert.equal(items[0]?.match("/events"), true)
  assert.equal(items[0]?.match("/receipts"), false)
  assert.equal(items[2]?.label, "Community")
  assert.equal(items[2]?.href, "/community")
  assert.equal(items[2]?.match("/community"), true)
  assert.equal(items[4]?.label, "Receipts")
  assert.equal(items[4]?.match("/receipts"), true)
})

test("admin mobile nav exposes community", () => {
  const items = getNavItems("ADMIN")

  assert.deepEqual(
    items.map((item) => item.label),
    ["Admin", "Community", "Messages", "Account"],
  )
  assert.equal(items[1]?.href, "/community")
  assert.equal(items[1]?.match("/community"), true)
})
