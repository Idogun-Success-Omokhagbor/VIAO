-- Idempotent repair for migration: 20251230142256_eeefffffe (PushSubscription)
-- Safe to run on an existing database. Does not drop or reset anything.

CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "expirationTime" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PushSubscription_pkey'
  ) THEN
    ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PushSubscription_userId_fkey'
  ) THEN
    ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
