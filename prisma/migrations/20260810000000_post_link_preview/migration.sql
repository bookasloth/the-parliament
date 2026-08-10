-- Add nullable JSON column holding server-fetched Open Graph metadata for
-- `link` posts (title/description/image/siteName/url). Null = no preview
-- (fetch failed or non-link post) → the UI renders the bare link.
ALTER TABLE "posts" ADD COLUMN "link_preview" JSONB;
