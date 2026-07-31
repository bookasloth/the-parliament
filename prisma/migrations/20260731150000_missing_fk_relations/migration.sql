-- Add the single-target foreign keys that were omitted (referential integrity).
-- These columns each point at exactly one table, so a real FK is correct here.
-- (The genuinely polymorphic entityType/entityId columns on Reaction/ContentReport/
-- Notification/KarmaTransaction are left as-is by design — a single FK is impossible;
-- entity is resolved app-side, and User-cascade + soft-deletes cover orphan cleanup.)
--
-- Both target tables (poll_eligibility, post_mentions) are empty on prod, so these
-- constraints add cleanly with no data to validate.

ALTER TABLE "poll_eligibility"
  ADD CONSTRAINT "poll_eligibility_poll_id_fkey"
  FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "post_mentions"
  ADD CONSTRAINT "post_mentions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "post_mentions"
  ADD CONSTRAINT "post_mentions_house_id_fkey"
  FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "post_mentions"
  ADD CONSTRAINT "post_mentions_batch_id_fkey"
  FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
