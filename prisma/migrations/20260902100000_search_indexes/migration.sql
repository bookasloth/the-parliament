-- Unified search (audit P1-1). Trigram GIN indexes make the cross-entity
-- ILIKE '%q%' searches index-backed. pg_trgm is already installed
-- (20260801020000_directory_search_indexes). Idempotent so it's a safe no-op
-- where an index was created by hand.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Posts: body search on the global feed.
CREATE INDEX IF NOT EXISTS posts_body_trgm        ON posts      USING gin (body gin_trgm_ops);

-- Groups.
CREATE INDEX IF NOT EXISTS groups_name_trgm        ON groups     USING gin (name gin_trgm_ops);

-- Events.
CREATE INDEX IF NOT EXISTS events_title_trgm        ON events     USING gin (title gin_trgm_ops);

-- Businesses.
CREATE INDEX IF NOT EXISTS businesses_name_trgm     ON businesses USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS businesses_tagline_trgm  ON businesses USING gin (tagline gin_trgm_ops);

-- Hashtags.
CREATE INDEX IF NOT EXISTS hashtags_tag_trgm        ON hashtags   USING gin (tag gin_trgm_ops);
