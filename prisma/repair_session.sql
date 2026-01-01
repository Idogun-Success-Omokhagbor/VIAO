-- Idempotent repair for migration: 20251230150226_pnpm_prisma_generate (Session)
-- Safe to run on an existing database. Does not drop or reset anything.

CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userAgent" TEXT,
  "ip" TEXT,
  "lastSeenAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Session_pkey'
  ) THEN
    ALTER TABLE "Session" ADD CONSTRAINT "Session_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Session_userId_revokedAt_idx" ON "Session"("userId", "revokedAt");
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Session_userId_fkey'
  ) THEN
    ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
