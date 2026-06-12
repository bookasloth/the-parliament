-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "designation" VARCHAR(160),
ADD COLUMN     "higher_education" VARCHAR(200),
ADD COLUMN     "linkedin_url" TEXT,
ADD COLUMN     "skills" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "membership_expires_at" TIMESTAMPTZ,
ADD COLUMN     "membership_status" VARCHAR(20) NOT NULL DEFAULT 'free',
ADD COLUMN     "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboarding_step" VARCHAR(30) NOT NULL DEFAULT 'verify',
ADD COLUMN     "profile_completion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verification_status" VARCHAR(20) NOT NULL DEFAULT 'pending';
