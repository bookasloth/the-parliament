-- Peer endorsements for alumni verifications. FK-less (app-layer joins), same
-- convention as reactions / content reports.

CREATE TABLE "endorsements" (
    "id" UUID NOT NULL,
    "verification_id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "endorser_id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
    "token" VARCHAR(64) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "endorsements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "endorsements_token_key" ON "endorsements"("token");
CREATE UNIQUE INDEX "endorsements_verification_id_endorser_id_key" ON "endorsements"("verification_id", "endorser_id");
CREATE INDEX "endorsements_verification_id_idx" ON "endorsements"("verification_id");
CREATE INDEX "endorsements_endorser_id_status_idx" ON "endorsements"("endorser_id", "status");
