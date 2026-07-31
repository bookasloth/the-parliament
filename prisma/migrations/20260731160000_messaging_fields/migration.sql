ALTER TABLE "conversations" ADD COLUMN "last_message_at" TIMESTAMPTZ;
ALTER TABLE "conversations" ADD COLUMN "dm_key" VARCHAR(80);
CREATE UNIQUE INDEX "conversations_dm_key_key" ON "conversations"("dm_key");
CREATE INDEX "conversations_last_message_at_idx" ON "conversations"("last_message_at");

ALTER TABLE "conversation_participants" ADD COLUMN "last_read_at" TIMESTAMPTZ;
CREATE INDEX "conversation_participants_user_id_idx" ON "conversation_participants"("user_id");

ALTER TABLE "messages" ADD COLUMN "media" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "messages" ADD COLUMN "edited_at" TIMESTAMPTZ;
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");
