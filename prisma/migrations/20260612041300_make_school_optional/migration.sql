-- DropForeignKey
ALTER TABLE "spotlights" DROP CONSTRAINT "spotlights_school_id_fkey";

-- AlterTable
ALTER TABLE "spotlights" ALTER COLUMN "school_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "spotlights" ADD CONSTRAINT "spotlights_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
