-- Rename the free default tier to "student".
-- Change the column default and migrate every existing free row.
ALTER TABLE "users" ALTER COLUMN "membership_status" SET DEFAULT 'student';
UPDATE "users" SET "membership_status" = 'student' WHERE "membership_status" = 'free';

-- Membership ledger + event rows that referenced the old code.
UPDATE "membership_events" SET "prev_plan" = 'student' WHERE "prev_plan" = 'free';
UPDATE "membership_events" SET "new_plan" = 'student' WHERE "new_plan" = 'free';
