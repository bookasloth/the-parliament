-- LinkedIn-style company fields on businesses + page followers (Phase 1b).

-- AlterTable
ALTER TABLE "businesses"
  ADD COLUMN "tagline" VARCHAR(160),
  ADD COLUMN "industry" VARCHAR(80),
  ADD COLUMN "founded_year" INTEGER,
  ADD COLUMN "employee_size" VARCHAR(20),
  ADD COLUMN "headquarters" VARCHAR(160),
  ADD COLUMN "social_links" JSONB,
  ADD COLUMN "follower_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "business_followers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "business_followers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_followers_business_id_user_id_key" ON "business_followers"("business_id", "user_id");

-- CreateIndex
CREATE INDEX "business_followers_user_id_idx" ON "business_followers"("user_id");

-- AddForeignKey
ALTER TABLE "business_followers" ADD CONSTRAINT "business_followers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_followers" ADD CONSTRAINT "business_followers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
