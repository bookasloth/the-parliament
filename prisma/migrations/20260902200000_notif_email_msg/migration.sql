-- Batch of P1 schema changes (audit P1-4/5/8/16). Idempotent guards so a manual
-- pre-apply and the deploy-time `prisma migrate deploy` don't collide.

-- P1-4: Notification.actorId + dead-link cleanup index.
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "actor_id" uuid;
CREATE INDEX IF NOT EXISTS "notifications_entity_type_entity_id_idx"
  ON "notifications" ("entity_type", "entity_id");

-- P1-5: per-viewer bell/push preferences.
CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "user_id"      uuid PRIMARY KEY,
  "push_enabled" boolean NOT NULL DEFAULT true,
  "muted_kinds"  text[]  NOT NULL DEFAULT '{}',
  "updated_at"   timestamptz NOT NULL DEFAULT now()
);

-- P1-8: email retry bookkeeping.
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "attempts" integer NOT NULL DEFAULT 0;
ALTER TABLE "email_messages" ADD COLUMN IF NOT EXISTS "next_attempt_at" timestamptz;

-- P1-16: message idempotency key. Unique per conversation; NULLs are distinct in
-- Postgres so existing rows (all NULL) never conflict.
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "client_msg_id" varchar(64);
CREATE UNIQUE INDEX IF NOT EXISTS "messages_conversation_id_client_msg_id_key"
  ON "messages" ("conversation_id", "client_msg_id");
