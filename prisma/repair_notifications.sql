-- Idempotent repair for the failed migration: 20251230012720_add_notifications
-- Safe to run on an existing database. Does not drop or reset anything.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
    CREATE TYPE "NotificationType" AS ENUM ('MESSAGE', 'LIKE', 'COMMENT', 'REPLY');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "data" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Notification_pkey'
  ) THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Notification_userId_fkey'
  ) THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
