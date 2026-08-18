-- WhatsApp utility-broadcast audit log (AiSensy). One row per admin broadcast.
CREATE TABLE "whatsapp_broadcasts" (
    "id" UUID NOT NULL,
    "campaign_name" VARCHAR(120) NOT NULL,
    "audience" VARCHAR(20) NOT NULL DEFAULT 'group',
    "group_id" UUID,
    "template_params" JSONB NOT NULL DEFAULT '[]',
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "sent_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_broadcasts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "whatsapp_broadcasts_created_at_idx" ON "whatsapp_broadcasts" ("created_at");
CREATE INDEX "whatsapp_broadcasts_group_id_idx" ON "whatsapp_broadcasts" ("group_id");
