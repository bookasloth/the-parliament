-- Phase 3: moderation actions log, member suspensions, report assignee.
-- Forward-only. Rollback note: DROP the two tables and the content_reports
-- column; no data migration needed (all new).

-- AlterTable
ALTER TABLE "content_reports" ADD COLUMN "assignee_id" UUID;

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" BIGSERIAL NOT NULL,
    "moderator_id" UUID NOT NULL,
    "target_type" VARCHAR(20) NOT NULL,
    "target_id" UUID NOT NULL,
    "action" VARCHAR(30) NOT NULL,
    "reason" TEXT,
    "expires_at" TIMESTAMPTZ,
    "report_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_suspensions" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "moderator_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "lifted_at" TIMESTAMPTZ,
    "lifted_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_suspensions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "moderation_actions_target_type_target_id_idx" ON "moderation_actions"("target_type", "target_id");
CREATE INDEX "moderation_actions_moderator_id_created_at_idx" ON "moderation_actions"("moderator_id", "created_at");
CREATE INDEX "member_suspensions_user_id_created_at_idx" ON "member_suspensions"("user_id", "created_at");
