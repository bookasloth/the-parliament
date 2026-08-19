-- Gallery: albums + images. Both FKs are nullable + ON DELETE SET NULL, so
-- deleting an album leaves its photos unfiled (never cascades) and clearing a
-- cover image just nulls the pointer.

-- CreateTable
CREATE TABLE "gallery_albums" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "description" TEXT,
    "cover_image_id" UUID,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "gallery_albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_images" (
    "id" UUID NOT NULL,
    "album_id" UUID,
    "caption" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "location" TEXT,
    "photographer" TEXT,
    "image_url" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "file_size" BIGINT NOT NULL DEFAULT 0,
    "mime_type" TEXT NOT NULL DEFAULT '',
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "gallery_images_width_check" CHECK ("width" > 0),
    CONSTRAINT "gallery_images_height_check" CHECK ("height" > 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "gallery_albums_slug_key" ON "gallery_albums"("slug");

-- CreateIndex
CREATE INDEX "gallery_albums_is_published_display_order_idx" ON "gallery_albums"("is_published", "display_order");

-- CreateIndex
CREATE INDEX "gallery_images_album_id_is_published_display_order_created_at_idx" ON "gallery_images"("album_id", "is_published", "display_order", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "gallery_albums" ADD CONSTRAINT "gallery_albums_cover_image_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "gallery_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "gallery_albums"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- touch updated_at on UPDATE. Prisma's @updatedAt already sets it for app writes;
-- this trigger keeps it correct for any raw SQL updates too (belt & suspenders).
CREATE OR REPLACE FUNCTION gallery_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER gallery_albums_touch BEFORE UPDATE ON "gallery_albums"
FOR EACH ROW EXECUTE FUNCTION gallery_touch_updated_at();

CREATE TRIGGER gallery_images_touch BEFORE UPDATE ON "gallery_images"
FOR EACH ROW EXECUTE FUNCTION gallery_touch_updated_at();
