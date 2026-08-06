-- Call-log messages: a message can be a normal "text" (default) or a "call"
-- entry whose lifecycle (ringing → completed/missed, duration) lives in call_data.
ALTER TABLE "messages" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'text';
ALTER TABLE "messages" ADD COLUMN "call_data" JSONB;
