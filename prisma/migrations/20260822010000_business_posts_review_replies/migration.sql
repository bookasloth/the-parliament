-- Phase 2: business page posts + owner replies to reviews.

-- AlterTable
ALTER TABLE "business_reviews"
  ADD COLUMN "owner_reply" TEXT,
  ADD COLUMN "owner_reply_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "business_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "image_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "business_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_posts_business_id_created_at_idx" ON "business_posts"("business_id", "created_at");

-- AddForeignKey
ALTER TABLE "business_posts" ADD CONSTRAINT "business_posts_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
