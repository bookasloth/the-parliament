-- Convert four fully code-controlled string columns to Postgres enums for
-- DB-level value validation. Value sets are exhaustive per the app.
--
-- PROD PREFLIGHT (run before deploy — a value outside the set aborts the ALTER):
--   SELECT DISTINCT status FROM users;
--   SELECT DISTINCT verification_status FROM users;
--   SELECT DISTINCT type FROM reactions;
--   SELECT DISTINCT role FROM karma_transactions;

CREATE TYPE "UserStatus" AS ENUM ('active', 'inactive', 'suspended', 'banned');
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "ReactionType" AS ENUM ('upvote', 'downvote', 'like');
CREATE TYPE "KarmaRole" AS ENUM ('actor', 'publisher', 'self');

-- users.status
ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "status" TYPE "UserStatus" USING "status"::"UserStatus";
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'active';

-- users.verification_status
ALTER TABLE "users" ALTER COLUMN "verification_status" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "verification_status" TYPE "VerificationStatus" USING "verification_status"::"VerificationStatus";
ALTER TABLE "users" ALTER COLUMN "verification_status" SET DEFAULT 'pending';

-- reactions.type (no default)
ALTER TABLE "reactions" ALTER COLUMN "type" TYPE "ReactionType" USING "type"::"ReactionType";

-- karma_transactions.role (no default)
ALTER TABLE "karma_transactions" ALTER COLUMN "role" TYPE "KarmaRole" USING "role"::"KarmaRole";
