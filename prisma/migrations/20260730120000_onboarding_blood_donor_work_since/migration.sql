-- Onboarding: blood-donor willingness + work "since" date on profiles.
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "blood_donor" boolean NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "work_since" date;
