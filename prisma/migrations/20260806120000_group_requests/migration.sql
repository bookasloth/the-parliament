-- CreateEnum
CREATE TYPE "GroupRequestCategory" AS ENUM ('emergency', 'travel', 'access', 'career', 'mentor');

-- CreateEnum
CREATE TYPE "GroupRequestStatus" AS ENUM ('open', 'accepted', 'resolved', 'closed');

-- CreateTable
CREATE TABLE "group_requests" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "category" "GroupRequestCategory" NOT NULL,
    "body" TEXT NOT NULL,
    "status" "GroupRequestStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_requests_group_id_status_idx" ON "group_requests"("group_id", "status");

-- CreateIndex
CREATE INDEX "group_requests_user_id_created_at_idx" ON "group_requests"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "group_requests" ADD CONSTRAINT "group_requests_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_requests" ADD CONSTRAINT "group_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
