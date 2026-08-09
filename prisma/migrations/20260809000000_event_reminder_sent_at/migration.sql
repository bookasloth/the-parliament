-- Marker for the T-24h event-reminder fan-out (idempotency; claimed atomically before send).
ALTER TABLE "events" ADD COLUMN "reminder_sent_at" TIMESTAMPTZ;
