-- Idempotency ledger for payment-provider webhooks (Razorpay retries duplicate
-- deliveries; dedup on the unique X-Razorpay-Event-Id).
CREATE TABLE "processed_webhook_events" (
    "id" UUID NOT NULL,
    "event_id" VARCHAR(128) NOT NULL,
    "event_type" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "processed_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "processed_webhook_events_event_id_key" ON "processed_webhook_events"("event_id");
