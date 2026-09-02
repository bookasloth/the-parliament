-- P0 safety batch — one-time backfill. Run manually on prod (Supabase SQL editor).
-- No schema migration is needed: the batch is code-only. This just corrects data
-- the old code left in a bad state.

-- ── P0-10: recompute reportPenalty from currently-open reports ────────────────
-- The old fileReport incremented reportPenalty on EVERY re-file and never
-- decremented on dismissal, so many posts carry an inflated penalty. Reset each
-- post's penalty to its count of still-open reports. Ranking scores refresh on
-- the next engagement, or recompute them in the app if you want it immediate.
UPDATE posts p
SET report_penalty = COALESCE(r.open_count, 0)
FROM (
  SELECT entity_id, COUNT(*)::numeric AS open_count
  FROM content_reports
  WHERE entity_type = 'post' AND status = 'open'
  GROUP BY entity_id
) r
WHERE p.id = r.entity_id::uuid;

-- Zero out penalties on posts that have NO open reports at all.
UPDATE posts p
SET report_penalty = 0
WHERE p.report_penalty <> 0
  AND NOT EXISTS (
    SELECT 1 FROM content_reports c
    WHERE c.entity_type = 'post' AND c.status = 'open' AND c.entity_id::uuid = p.id
  );

-- ── P0-5: reopen non-post reports that were "resolved" but never enforced ─────
-- Before this batch, resolving a comment/profile/business/message report as
-- hidden/removed cleared the queue WITHOUT touching the content. Reopen them so a
-- moderator can now actually action them. (Review before running — this surfaces
-- old decisions back into the queue.)
UPDATE content_reports
SET status = 'open', resolved_at = NULL, resolved_by = NULL
WHERE entity_type <> 'post'
  AND status IN ('hidden', 'removed');
