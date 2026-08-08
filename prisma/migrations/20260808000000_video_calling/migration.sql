-- Video calling (LiveKit): call sessions, usage ledger, student passes, AMA sessions.
-- Plain user_id (TEXT) columns, no FK — app-layer joins (Reaction/PushSubscription style).

CREATE TABLE "call_sessions" (
  "id"              TEXT NOT NULL,
  "room_name"       TEXT NOT NULL,
  "kind"            VARCHAR(10) NOT NULL,
  "conversation_id" TEXT,
  "ama_session_id"  TEXT,
  "started_by_id"   TEXT NOT NULL,
  "status"          VARCHAR(12) NOT NULL DEFAULT 'live',
  "started_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ended_at"        TIMESTAMP(3),
  CONSTRAINT "call_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "call_sessions_room_name_key" ON "call_sessions"("room_name");
CREATE INDEX "call_sessions_conversation_id_idx" ON "call_sessions"("conversation_id");
CREATE INDEX "call_sessions_ama_session_id_idx" ON "call_sessions"("ama_session_id");

CREATE TABLE "call_usage" (
  "id"              TEXT NOT NULL,
  "user_id"         TEXT NOT NULL,
  "call_session_id" TEXT,
  "kind"            VARCHAR(10) NOT NULL,
  "minutes"         INTEGER NOT NULL,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "call_usage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "call_usage_user_id_created_at_idx" ON "call_usage"("user_id", "created_at");
CREATE INDEX "call_usage_created_at_idx" ON "call_usage"("created_at");

CREATE TABLE "call_passes" (
  "id"              TEXT NOT NULL,
  "user_id"         TEXT NOT NULL,
  "minutes"         INTEGER NOT NULL DEFAULT 30,
  "status"          VARCHAR(12) NOT NULL DEFAULT 'active',
  "payment_id"      TEXT,
  "order_id"        TEXT,
  "call_session_id" TEXT,
  "purchased_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at"      TIMESTAMP(3) NOT NULL,
  "consumed_at"     TIMESTAMP(3),
  CONSTRAINT "call_passes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "call_passes_user_id_status_idx" ON "call_passes"("user_id", "status");

CREATE TABLE "ama_sessions" (
  "id"          TEXT NOT NULL,
  "title"       VARCHAR(160) NOT NULL,
  "description" TEXT,
  "host_id"     TEXT NOT NULL,
  "co_host_id"  TEXT,
  "room_name"   TEXT NOT NULL,
  "status"      VARCHAR(12) NOT NULL DEFAULT 'scheduled',
  "starts_at"   TIMESTAMP(3) NOT NULL,
  "ended_at"    TIMESTAMP(3),
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ama_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ama_sessions_room_name_key" ON "ama_sessions"("room_name");
CREATE INDEX "ama_sessions_starts_at_idx" ON "ama_sessions"("starts_at");
