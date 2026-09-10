-- Featured directory listing (value-first ads: the ₹2,000/yr "Featured" slot).
-- Admin-toggled flag + an auto-expiring term, so a paid promotion lifts the
-- listing to the top of the directory and drops off on its own when the term
-- lapses. New columns + index, written idempotently so a manual Supabase apply
-- followed by `prisma migrate deploy` is a clean no-op, not a jam.
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "featured_until" TIMESTAMPTZ;

-- Supports the directory query: filter by (school, status) and lift featured rows.
CREATE INDEX IF NOT EXISTS "businesses_school_id_status_featured_idx"
    ON "businesses" ("school_id", "status", "featured");
