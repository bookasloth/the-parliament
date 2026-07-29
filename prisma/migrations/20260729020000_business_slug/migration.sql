-- Add a URL slug to businesses (alumni-owned business directory at /business/<slug>).
ALTER TABLE "businesses" ADD COLUMN "slug" VARCHAR(220) NOT NULL DEFAULT '';
CREATE UNIQUE INDEX "businesses_slug_key" ON "businesses"("slug");
ALTER TABLE "businesses" ALTER COLUMN "slug" DROP DEFAULT;
