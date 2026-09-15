-- Speed up @mention autocomplete's substring search. The query does
-- ILIKE '%q%' on users.display_name / legal_name / username; a leading wildcard
-- can't use a btree index, so it full-scans the users table on every keystroke.
-- A pg_trgm GIN index makes these substring matches index-backed.
--
-- Run once in the Supabase SQL editor of the Parliament project. Safe/idempotent.

create extension if not exists pg_trgm;

create index if not exists users_display_name_trgm
  on public.users using gin (display_name gin_trgm_ops);

create index if not exists users_legal_name_trgm
  on public.users using gin (legal_name gin_trgm_ops);

create index if not exists users_username_trgm
  on public.users using gin (username gin_trgm_ops);
