import assert from "node:assert/strict"
import test from "node:test"

import {
  EVENT_CATEGORY_COLORS,
  EVENT_CATEGORY_FILTER_OPTIONS,
  EVENT_FORM_CATEGORY_OPTIONS,
  getEventCategoryColor,
} from "../lib/event-categories"

test("event category helpers expose consistent metadata", () => {
  assert.equal(getEventCategoryColor("Technology"), EVENT_CATEGORY_COLORS["Technology"])
  assert.equal(getEventCategoryColor("Unknown"), "bg-gray-400")
  assert.equal(getEventCategoryColor(null), "bg-gray-400")
})

test("filter options and form options stay aligned with supported categories", () => {
  const filterValues = EVENT_CATEGORY_FILTER_OPTIONS.map((option) => option.value)
  const formValues = EVENT_FORM_CATEGORY_OPTIONS.map((option) => option.id)

  assert.equal(filterValues[0], "all")
  assert.deepEqual(filterValues.slice(1), formValues)
})
