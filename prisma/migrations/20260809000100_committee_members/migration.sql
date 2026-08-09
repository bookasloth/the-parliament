-- Email routing list for the functional committees. Members are managed by email
-- (they rotate), decoupled from user accounts.
CREATE TABLE "committee_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "committee" VARCHAR(40) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "name" VARCHAR(120),
    "role" VARCHAR(20) NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "committee_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "committee_members_committee_email_key" ON "committee_members"("committee", "email");
CREATE INDEX "committee_members_committee_idx" ON "committee_members"("committee");
