-- Collaborative gallery: member ownership + attribution + event linkage.
-- Additive only; existing gallery tables already carry data.

-- AlterTable
ALTER TABLE "gallery_albums"
    ADD COLUMN "created_by_id" UUID,
    ADD COLUMN "event_id" UUID;

-- AlterTable
ALTER TABLE "gallery_images"
    ADD COLUMN "uploaded_by_id" UUID;

-- CreateIndex: at most one album per event
CREATE UNIQUE INDEX "gallery_albums_event_id_key" ON "gallery_albums"("event_id");

-- CreateIndex
CREATE INDEX "gallery_albums_created_by_id_idx" ON "gallery_albums"("created_by_id");

-- CreateIndex
CREATE INDEX "gallery_images_uploaded_by_id_idx" ON "gallery_images"("uploaded_by_id");
