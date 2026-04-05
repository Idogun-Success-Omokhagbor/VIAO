import assert from "node:assert/strict"
import test from "node:test"

import { mapEventForClient } from "../lib/event-response"

test("mapEventForClient normalizes expired boost and current-user state", () => {
  const originalNow = Date.now
  Date.now = () => new Date("2026-04-02T12:00:00Z").getTime()

  try {
    const mapped = mapEventForClient(
      {
        id: "event-1",
        title: "Sample Event",
        description: "Example",
        date: new Date("2026-04-03T18:00:00Z"),
        timeLabel: "18:00",
        location: "Zurich",
        startsAt: new Date("2026-04-03T18:00:00Z"),
        endsAt: new Date("2026-04-03T21:00:00Z"),
        city: "Zurich",
        venue: "Hall",
        address: "Street 1",
        lat: 47.37,
        lng: 8.54,
        status: "PUBLISHED",
        isCancelled: false,
        cancelledAt: null,
        category: "Technology",
        imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnSUsAAAAAASUVORK5CYII=",
        imageUrls: [],
        price: 10,
        isBoosted: true,
        boostLevel: 2,
        boostUntil: new Date("2026-04-01T12:00:00Z"),
        maxAttendees: 100,
        organizerId: "org-1",
        organizer: { id: "org-1", name: "Organizer", avatarUrl: null },
        rsvps: [
          { userId: "user-1", status: "GOING" },
          { userId: "user-2", status: "GOING" },
          { userId: "user-3", status: "MAYBE" },
        ],
        saves: [{ userId: "user-1" }],
        createdAt: new Date("2026-03-01T12:00:00Z"),
        updatedAt: new Date("2026-03-02T12:00:00Z"),
      } as any,
      "user-1",
    )

    assert.equal(mapped.isBoosted, false)
    assert.equal(mapped.boostLevel, 0)
    assert.equal(mapped.boostUntil, null)
    assert.equal(mapped.attendeesCount, 2)
    assert.equal(mapped.isGoing, true)
    assert.equal(mapped.isSaved, true)
    assert.equal(mapped.imageUrl, "/api/events/event-1/image")
    assert.deepEqual(mapped.imageUrls, ["/api/events/event-1/image"])
  } finally {
    Date.now = originalNow
  }
})

test("mapEventForClient keeps active boost and returns null user flags without a session user", () => {
  const originalNow = Date.now
  Date.now = () => new Date("2026-04-02T12:00:00Z").getTime()

  try {
    const mapped = mapEventForClient(
      {
        id: "event-2",
        title: "Another Event",
        description: "Example",
        date: new Date("2026-04-05T18:00:00Z"),
        timeLabel: null,
        location: "Geneva",
        startsAt: null,
        endsAt: null,
        city: null,
        venue: null,
        address: null,
        lat: null,
        lng: null,
        status: "PUBLISHED",
        isCancelled: false,
        cancelledAt: null,
        category: "Music",
        imageUrl: "https://example.com/poster.jpg",
        imageUrls: ["https://example.com/poster.jpg"],
        price: null,
        isBoosted: true,
        boostLevel: 2,
        boostUntil: new Date("2026-04-03T12:00:00Z"),
        maxAttendees: null,
        organizerId: "org-2",
        organizer: { id: "org-2", name: "Organizer", avatarUrl: "https://example.com/avatar.jpg" },
        rsvps: [{ userId: "user-2", status: "GOING" }],
        saves: [{ userId: "user-2" }],
        createdAt: new Date("2026-03-01T12:00:00Z"),
        updatedAt: new Date("2026-03-02T12:00:00Z"),
      } as any,
    )

    assert.equal(mapped.isBoosted, true)
    assert.equal(mapped.boostLevel, 2)
    assert.equal(mapped.isGoing, false)
    assert.equal(mapped.rsvpStatus, null)
    assert.equal(mapped.isSaved, false)
    assert.equal(mapped.organizerAvatarUrl, "https://example.com/avatar.jpg")
  } finally {
    Date.now = originalNow
  }
})
