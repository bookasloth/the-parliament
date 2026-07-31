-- Enums batch 2: money / membership lifecycle status columns.
--
-- PROD PREFLIGHT (run before deploy — a value outside the set aborts the ALTER):
--   SELECT DISTINCT status FROM memberships;
--   SELECT DISTINCT status FROM membership_orders;
--   SELECT DISTINCT status FROM membership_refunds;
--   SELECT DISTINCT status FROM committee_invites;
--   SELECT DISTINCT status FROM payments;
--   SELECT DISTINCT status FROM karma_redemptions;

CREATE TYPE "MembershipStatus" AS ENUM ('active', 'expired', 'superseded', 'refunded', 'cancelled');
CREATE TYPE "MembershipOrderStatus" AS ENUM ('created', 'attempted', 'paid', 'failed', 'refunded', 'superseded');
CREATE TYPE "MembershipRefundStatus" AS ENUM ('pending', 'processed', 'accepted', 'declined', 'failed');
CREATE TYPE "CommitteeInviteStatus" AS ENUM ('pending', 'accepted', 'declined', 'expired', 'revoked');
CREATE TYPE "PaymentStatus" AS ENUM ('created', 'paid', 'failed', 'refunded');
CREATE TYPE "KarmaRedemptionStatus" AS ENUM ('fulfilled', 'pending', 'refunded', 'cancelled');

ALTER TABLE "memberships" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "memberships" ALTER COLUMN "status" TYPE "MembershipStatus" USING "status"::"MembershipStatus";
ALTER TABLE "memberships" ALTER COLUMN "status" SET DEFAULT 'active';

ALTER TABLE "membership_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "membership_orders" ALTER COLUMN "status" TYPE "MembershipOrderStatus" USING "status"::"MembershipOrderStatus";
ALTER TABLE "membership_orders" ALTER COLUMN "status" SET DEFAULT 'created';

ALTER TABLE "membership_refunds" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "membership_refunds" ALTER COLUMN "status" TYPE "MembershipRefundStatus" USING "status"::"MembershipRefundStatus";
ALTER TABLE "membership_refunds" ALTER COLUMN "status" SET DEFAULT 'pending';

ALTER TABLE "committee_invites" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "committee_invites" ALTER COLUMN "status" TYPE "CommitteeInviteStatus" USING "status"::"CommitteeInviteStatus";
ALTER TABLE "committee_invites" ALTER COLUMN "status" SET DEFAULT 'pending';

ALTER TABLE "payments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "payments" ALTER COLUMN "status" TYPE "PaymentStatus" USING "status"::"PaymentStatus";
ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'created';

ALTER TABLE "karma_redemptions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "karma_redemptions" ALTER COLUMN "status" TYPE "KarmaRedemptionStatus" USING "status"::"KarmaRedemptionStatus";
ALTER TABLE "karma_redemptions" ALTER COLUMN "status" SET DEFAULT 'fulfilled';
