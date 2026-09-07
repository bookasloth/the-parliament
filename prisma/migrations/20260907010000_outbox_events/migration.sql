-- Transactional outbox (audit IP-5). New table, no drift risk. Written
-- idempotently (IF NOT EXISTS) so a manual Supabase apply followed by
-- `prisma migrate deploy` on the next deploy is a clean no-op, not a jam.
CREATE TABLE IF NOT EXISTS "outbox_events" (
    "id" UUID NOT NULL,
    "type" VARCHAR(60) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "dedupe_key" VARCHAR(200),
    "status" VARCHAR(12) NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ,
    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "outbox_events_status_next_attempt_at_idx"
    ON "outbox_events" ("status", "next_attempt_at");
