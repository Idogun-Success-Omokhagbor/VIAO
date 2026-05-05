import assert from "node:assert/strict"
import test from "node:test"

import { getBrandMarkGlyphMetrics } from "../lib/brand-mark"

test("brand mark adds horizontal inset so the V does not sit flush against the tile edge", () => {
  const metrics = getBrandMarkGlyphMetrics(32)

  assert.equal(metrics.fontSize, 21)
  assert.equal(metrics.offsetX, 1)
  assert.equal(metrics.offsetY, -1)
  assert.equal(metrics.paddingInline, 2)
})

test("brand mark scales its inset with larger icon sizes", () => {
  const metrics = getBrandMarkGlyphMetrics(40)

  assert.equal(metrics.fontSize, 26)
  assert.equal(metrics.offsetX, 2)
  assert.equal(metrics.paddingInline, 2)
})
