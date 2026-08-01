-- Directory/community people-search performance.
-- Trigram GIN indexes make ILIKE '%q%' (Prisma `contains` insensitive) index-backed;
-- composite index serves the default browse sort. Idempotent so it's a no-op on
-- prod (already created by hand) but provisions fresh/test environments.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS users_legal_name_trgm    ON users    USING gin (legal_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS users_display_name_trgm  ON users    USING gin (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS users_username_trgm       ON users    USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_city_trgm        ON profiles USING gin (city gin_trgm_ops);
CREATE INDEX IF NOT EXISTS profiles_profession_trgm  ON profiles USING gin (profession gin_trgm_ops);

CREATE INDEX IF NOT EXISTS users_directory_sort
  ON users (status, is_verified DESC, last_login_at DESC NULLS LAST);
