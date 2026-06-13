-- Email infra per MEMBERSHIP_PLAN.md §12

CREATE TABLE "email_templates" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "code" VARCHAR(80) UNIQUE NOT NULL,
    "subject" VARCHAR(240) NOT NULL,
    "html_body" TEXT NOT NULL,
    "text_body" TEXT NOT NULL,
    "category" VARCHAR(30) NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID
);
CREATE INDEX "email_templates_category_is_active_idx" ON "email_templates" ("category", "is_active");

CREATE TABLE "email_messages" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "to_address" VARCHAR(254) NOT NULL,
    "template_code" VARCHAR(80) NOT NULL,
    "category" VARCHAR(30) NOT NULL,
    "subject" VARCHAR(240) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'queued',
    "queued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ,
    "error" TEXT,
    "provider_msg_id" VARCHAR(160),
    "metadata" JSONB NOT NULL DEFAULT '{}'
);
CREATE INDEX "email_messages_user_id_queued_at_idx" ON "email_messages" ("user_id", "queued_at");
CREATE INDEX "email_messages_template_code_idx" ON "email_messages" ("template_code");
CREATE INDEX "email_messages_category_idx" ON "email_messages" ("category");
CREATE INDEX "email_messages_provider_msg_id_idx" ON "email_messages" ("provider_msg_id");
CREATE INDEX "email_messages_status_queued_at_idx" ON "email_messages" ("status", "queued_at");

CREATE TABLE "email_preferences" (
    "user_id" UUID PRIMARY KEY,
    "transactional" BOOLEAN NOT NULL DEFAULT true,
    "lifecycle" BOOLEAN NOT NULL DEFAULT true,
    "reminders" BOOLEAN NOT NULL DEFAULT true,
    "wishes" BOOLEAN NOT NULL DEFAULT true,
    "festival_greetings" BOOLEAN NOT NULL DEFAULT true,
    "engagement" BOOLEAN NOT NULL DEFAULT true,
    "digests" BOOLEAN NOT NULL DEFAULT true,
    "marketing" BOOLEAN NOT NULL DEFAULT true,
    "quiet_hours_start_ist" INTEGER,
    "quiet_hours_end_ist" INTEGER,
    "language" VARCHAR(8) NOT NULL DEFAULT 'en'
);

CREATE TABLE "email_suppressions" (
    "email_address" VARCHAR(254) PRIMARY KEY,
    "reason" VARCHAR(30) NOT NULL,
    "suppressed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "email_unsubscribe_tokens" (
    "token" VARCHAR(80) PRIMARY KEY,
    "user_id" UUID NOT NULL,
    "category" VARCHAR(30) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "email_unsubscribe_tokens_user_id_category_idx" ON "email_unsubscribe_tokens" ("user_id", "category");
CREATE INDEX "email_unsubscribe_tokens_expires_at_idx" ON "email_unsubscribe_tokens" ("expires_at");
