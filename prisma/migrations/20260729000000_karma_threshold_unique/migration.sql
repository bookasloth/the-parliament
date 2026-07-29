-- Add the missing (school_id, name) unique index for KarmaThreshold.
-- The schema declared @@unique([schoolId, name]) but migration
-- 20260612090000_google_auth_onboarding created the table without it.
CREATE UNIQUE INDEX "karma_thresholds_school_id_name_key" ON "karma_thresholds"("school_id", "name");
