-- Add "draft" to the PostStatus enum so posts can be saved as drafts.
-- IF NOT EXISTS keeps the migration idempotent across re-runs.
ALTER TYPE "PostStatus" ADD VALUE IF NOT EXISTS 'draft';
