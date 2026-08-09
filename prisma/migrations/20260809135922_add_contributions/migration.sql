-- Public "Support NNAWCA" contributions + /development sponsor wall.
-- Standalone table, no FKs (anonymous givers need no User row).
CREATE TABLE "contributions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "amount_paise" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "tier" VARCHAR(16) NOT NULL,
    "kind" VARCHAR(16) NOT NULL DEFAULT 'individual',
    "user_id" UUID,
    "show_on_wall" BOOLEAN NOT NULL DEFAULT false,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "display_name" VARCHAR(80),
    "website_url" VARCHAR(200),
    "logo_url" VARCHAR(300),
    "message" VARCHAR(280),
    "email" VARCHAR(200),
    "status" VARCHAR(12) NOT NULL DEFAULT 'pending',
    "razorpay_order_id" VARCHAR(64),
    "razorpay_payment_id" VARCHAR(64),
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMPTZ,
    "approved_by_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ,

    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contributions_razorpay_order_id_key" ON "contributions"("razorpay_order_id");
CREATE INDEX "contributions_status_approved_show_on_wall_idx" ON "contributions"("status", "approved", "show_on_wall");
CREATE INDEX "contributions_created_at_idx" ON "contributions"("created_at");
