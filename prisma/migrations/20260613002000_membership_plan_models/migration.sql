-- User additions per MEMBERSHIP_PLAN.md §3a
ALTER TABLE "users" ADD COLUMN "membership_cycle_start" TIMESTAMPTZ;
ALTER TABLE "users" ADD COLUMN "benefit_tier" VARCHAR(20) NOT NULL DEFAULT 'base';
ALTER TABLE "users" ADD COLUMN "pass_out_year" INTEGER;
ALTER TABLE "users" ADD COLUMN "is_super_admin" BOOLEAN NOT NULL DEFAULT false;

-- Drop legacy membership_plans (per plan, plans are code-defined in src/config/membership.ts)
ALTER TABLE "memberships" DROP CONSTRAINT IF EXISTS "memberships_plan_id_fkey";
ALTER TABLE "memberships" DROP COLUMN IF EXISTS "plan_id";
ALTER TABLE "memberships" DROP COLUMN IF EXISTS "expires_at";
DROP INDEX IF EXISTS "memberships_userId_status_idx";
DROP INDEX IF EXISTS "memberships_user_id_status_idx";
DROP INDEX IF EXISTS "memberships_expiresAt_idx";
DROP INDEX IF EXISTS "memberships_expires_at_idx";
DROP TABLE IF EXISTS "membership_plans";

-- Refactor memberships per §3b
ALTER TABLE "memberships" ADD COLUMN "plan_code" VARCHAR(20) NOT NULL DEFAULT 'free';
ALTER TABLE "memberships" ADD COLUMN "benefit_tier" VARCHAR(20) NOT NULL DEFAULT 'base';
ALTER TABLE "memberships" ADD COLUMN "ends_at" TIMESTAMPTZ;
ALTER TABLE "memberships" ADD COLUMN "amount_paise" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "memberships" ADD COLUMN "source" VARCHAR(30) NOT NULL DEFAULT 'purchase';
ALTER TABLE "memberships" ADD COLUMN "order_id" UUID;
ALTER TABLE "memberships" ADD COLUMN "granted_by_user_id" UUID;
ALTER TABLE "memberships" ALTER COLUMN "plan_code" DROP DEFAULT;
ALTER TABLE "memberships" ALTER COLUMN "benefit_tier" DROP DEFAULT;
CREATE INDEX "memberships_user_id_status_ends_at_idx" ON "memberships" ("user_id", "status", "ends_at");
CREATE INDEX "memberships_ends_at_idx" ON "memberships" ("ends_at");
CREATE INDEX "memberships_razorpay_subscription_id_idx" ON "memberships" ("razorpay_subscription_id");

-- MembershipOrder per §3c
CREATE TABLE "membership_orders" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "plan_code" VARCHAR(20) NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" VARCHAR(20) NOT NULL DEFAULT 'created',
    "razorpay_order_id" VARCHAR(64) UNIQUE,
    "razorpay_subscription_id" VARCHAR(64),
    "razorpay_payment_id" VARCHAR(64),
    "razorpay_signature" TEXT,
    "captured_at" TIMESTAMPTZ,
    "error_code" VARCHAR(60),
    "error_reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "membership_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "membership_orders_user_id_created_at_idx" ON "membership_orders" ("user_id", "created_at");
CREATE INDEX "membership_orders_status_idx" ON "membership_orders" ("status");

-- Hook memberships.order_id to membership_orders
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "membership_orders"("id") ON DELETE SET NULL;

-- MembershipInvoice per §3d
CREATE TABLE "membership_invoices" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id" UUID UNIQUE NOT NULL,
    "user_id" UUID NOT NULL,
    "invoice_number" VARCHAR(40) UNIQUE NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "gst_amount_paise" INTEGER,
    "pdf_key" TEXT,
    "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "membership_invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "membership_orders"("id") ON DELETE CASCADE,
    CONSTRAINT "membership_invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "membership_invoices_user_id_issued_at_idx" ON "membership_invoices" ("user_id", "issued_at");

-- MembershipRefund per §3e
CREATE TABLE "membership_refunds" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "razorpay_refund_id" VARCHAR(64) UNIQUE NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "processed_at" TIMESTAMPTZ,
    "initiated_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "membership_refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "membership_orders"("id") ON DELETE CASCADE,
    CONSTRAINT "membership_refunds_initiated_by_user_id_fkey" FOREIGN KEY ("initiated_by_user_id") REFERENCES "users"("id")
);
CREATE INDEX "membership_refunds_order_id_idx" ON "membership_refunds" ("order_id");

-- MembershipEvent per §3f
CREATE TABLE "membership_events" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "prev_plan" VARCHAR(20),
    "new_plan" VARCHAR(20),
    "order_id" UUID,
    "actor_user_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "membership_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "membership_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
);
CREATE INDEX "membership_events_user_id_created_at_idx" ON "membership_events" ("user_id", "created_at");
CREATE INDEX "membership_events_type_created_at_idx" ON "membership_events" ("type", "created_at");

-- CommitteeInvite per §3g
CREATE TABLE "committee_invites" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "invited_by_user_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "responded_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "committee_invites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "committee_invites_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id")
);
CREATE INDEX "committee_invites_user_id_status_idx" ON "committee_invites" ("user_id", "status");
CREATE INDEX "committee_invites_status_expires_at_idx" ON "committee_invites" ("status", "expires_at");

-- PollEligibility per §1e / §9
CREATE TABLE "poll_eligibility" (
    "poll_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "snapshot_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("poll_id", "user_id"),
    CONSTRAINT "poll_eligibility_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "poll_eligibility_poll_id_idx" ON "poll_eligibility" ("poll_id");
