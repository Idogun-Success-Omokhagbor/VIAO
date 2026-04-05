import assert from "node:assert/strict"
import test from "node:test"

import { getPublicAppUrl, hashStripeSessionId, parseBoostLevel } from "../lib/stripe-boost"

test("getPublicAppUrl prefers the configured non-local production app URL", () => {
  const previousAppUrl = process.env.APP_URL
  const previousPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL

  process.env.APP_URL = "https://viao.ch/"
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"

  try {
    const req = new Request("http://localhost:3000/api/stripe/checkout", {
      headers: {
        origin: "http://localhost:3000",
        host: "localhost:3000",
      },
    })

    assert.equal(getPublicAppUrl(req), "https://viao.ch")
  } finally {
    process.env.APP_URL = previousAppUrl
    process.env.NEXT_PUBLIC_APP_URL = previousPublicAppUrl
  }
})

test("getPublicAppUrl derives a forwarded host when env URLs are local only", () => {
  const previousAppUrl = process.env.APP_URL
  const previousPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL

  process.env.APP_URL = "http://localhost:3000"
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"

  try {
    const req = new Request("https://internal/api/stripe/success", {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "app.viao.ch",
      },
    })

    assert.equal(getPublicAppUrl(req), "https://app.viao.ch")
  } finally {
    process.env.APP_URL = previousAppUrl
    process.env.NEXT_PUBLIC_APP_URL = previousPublicAppUrl
  }
})

test("hashStripeSessionId is deterministic with an explicit secret", () => {
  const hashA = hashStripeSessionId("cs_test_123", "secret-value")
  const hashB = hashStripeSessionId("cs_test_123", "secret-value")
  const hashC = hashStripeSessionId("cs_test_999", "secret-value")

  assert.equal(hashA, hashB)
  assert.notEqual(hashA, hashC)
})

test("parseBoostLevel maps unknown values to basic boost", () => {
  assert.equal(parseBoostLevel("2"), 2)
  assert.equal(parseBoostLevel("1"), 1)
  assert.equal(parseBoostLevel(undefined), 1)
  assert.equal(parseBoostLevel("premium"), 1)
})
