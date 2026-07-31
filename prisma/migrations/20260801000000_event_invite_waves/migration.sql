-- CreateTable
CREATE TABLE "event_invite_waves" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "tier" VARCHAR(20) NOT NULL,
    "send_after" TIMESTAMPTZ NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "sent_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_invite_waves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_invite_waves_event_id_tier_key" ON "event_invite_waves"("event_id", "tier");

-- CreateIndex
CREATE INDEX "event_invite_waves_status_send_after_idx" ON "event_invite_waves"("status", "send_after");

-- AddForeignKey
ALTER TABLE "event_invite_waves" ADD CONSTRAINT "event_invite_waves_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
