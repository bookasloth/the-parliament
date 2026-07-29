-- Add hometown, correspondence address, and blood group to profiles.
ALTER TABLE "profiles" ADD COLUMN "home_town" VARCHAR(160);
ALTER TABLE "profiles" ADD COLUMN "correspondence_address" TEXT;
ALTER TABLE "profiles" ADD COLUMN "blood_group" VARCHAR(5);
