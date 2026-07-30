-- Migrate the connections (mutual request/accept) model to a one-directional Follow model.

-- 1. Drop non-accepted rows; only accepted connections carry over as follows.
DELETE FROM "connections" WHERE "status" <> 'accepted';

-- 2. Rename table + columns to the follow shape.
ALTER TABLE "connections" RENAME TO "follows";
ALTER TABLE "follows" RENAME COLUMN "requester_id" TO "follower_id";
ALTER TABLE "follows" RENAME COLUMN "addressee_id" TO "following_id";

-- 3. An accepted connection was mutual → materialise the reverse follow.
INSERT INTO "follows" ("id", "follower_id", "following_id", "created_at")
SELECT gen_random_uuid(), "following_id", "follower_id", "created_at"
FROM "follows"
ON CONFLICT ("follower_id", "following_id") DO NOTHING;

-- 4. Drop connection-only columns.
ALTER TABLE "follows"
  DROP COLUMN "status",
  DROP COLUMN "auto_accepted",
  DROP COLUMN "contact_exchanged",
  DROP COLUMN "responded_at";

-- 5. Indexes + constraints.
DROP INDEX IF EXISTS "connections_addressee_id_status_idx";
CREATE INDEX "follows_following_id_idx" ON "follows"("following_id");
ALTER INDEX "connections_requester_id_addressee_id_key" RENAME TO "follows_follower_id_following_id_key";
ALTER TABLE "follows" RENAME CONSTRAINT "connections_requester_id_fkey" TO "follows_follower_id_fkey";
ALTER TABLE "follows" RENAME CONSTRAINT "connections_addressee_id_fkey" TO "follows_following_id_fkey";

-- 6. Drop dead columns from the follow refactor.
ALTER TABLE "users" DROP COLUMN IF EXISTS "connections_data";
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "connection_auto_accept";
