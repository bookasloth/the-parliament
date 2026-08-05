-- House systems: distinguish pre-2002 (old boys/girls houses) from post-2002
-- ANSU houses, and scope by gender. Existing profile.house_id values are NEVER
-- touched — this only adds metadata + the missing pre-2002 boys houses.

ALTER TABLE "houses" ADD COLUMN IF NOT EXISTS "system" VARCHAR(20) NOT NULL DEFAULT 'ansu';
ALTER TABLE "houses" ADD COLUMN IF NOT EXISTS "gender" VARCHAR(10);

-- Backfill the existing roster by name.
UPDATE "houses" SET "system" = 'ansu', "gender" = NULL
  WHERE "name" IN ('Aravali', 'Nilgiri', 'Shiwalik', 'Udaigiri');

UPDATE "houses" SET "system" = 'pre2002', "gender" = 'female', "is_girls_only" = true
  WHERE "name" IN ('Indira', 'Laxmi');

-- Add the pre-2002 boys houses for every existing school. Idempotent — the
-- (school_id, name) unique constraint makes re-runs no-ops.
INSERT INTO "houses" ("id", "school_id", "name", "color_name", "color_hex", "slogan", "is_girls_only", "system", "gender", "created_at")
SELECT gen_random_uuid(), s."id", h.name, h.color_name, h.color_hex, NULL, false, 'pre2002', 'male', now()
FROM "schools" s
CROSS JOIN (VALUES
  ('Jawahar', 'blue',   '#1e3a8a'),
  ('Tilak',   'green',  '#15803d'),
  ('Subhash', 'red',    '#b91c1c'),
  ('Rajiv',   'yellow', '#ca8a04')
) AS h(name, color_name, color_hex)
ON CONFLICT ("school_id", "name") DO NOTHING;
