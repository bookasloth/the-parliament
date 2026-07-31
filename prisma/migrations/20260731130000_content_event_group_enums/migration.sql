-- Enums batch 3: content / event / group / verification / business status columns.
--
-- PROD PREFLIGHT (run before deploy — a value outside the set aborts the ALTER):
--   SELECT DISTINCT visibility FROM profiles;
--   SELECT DISTINCT status FROM alumni_verifications;
--   SELECT DISTINCT status FROM posts;
--   SELECT DISTINCT status FROM content_reports;
--   SELECT DISTINCT visibility, status FROM events;  -- (mode kept as String — hyphenated values)
--   SELECT DISTINCT status FROM event_rsvps;
--   SELECT DISTINCT role FROM event_attendance;
--   SELECT DISTINCT status FROM businesses;
--   SELECT DISTINCT visibility FROM groups;
--   SELECT DISTINCT role, status FROM group_members;

CREATE TYPE "ProfileVisibility" AS ENUM ('alumni', 'public', 'private', 'connections');
CREATE TYPE "AlumniVerificationStatus" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "PostStatus" AS ENUM ('visible', 'hidden', 'deleted', 'removed');
CREATE TYPE "ContentReportStatus" AS ENUM ('open', 'reviewing', 'resolved', 'dismissed', 'actioned', 'hidden', 'removed', 'warned');
CREATE TYPE "EventVisibility" AS ENUM ('school', 'public', 'house', 'private');
CREATE TYPE "EventStatus" AS ENUM ('draft', 'published', 'cancelled', 'completed');
CREATE TYPE "EventRsvpStatus" AS ENUM ('going', 'maybe', 'not_going', 'waitlist');
CREATE TYPE "EventAttendanceRole" AS ENUM ('attendee', 'organizer', 'volunteer', 'speaker');
CREATE TYPE "BusinessStatus" AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE "GroupVisibility" AS ENUM ('public', 'private', 'secret');
CREATE TYPE "GroupRole" AS ENUM ('member', 'admin', 'moderator');
CREATE TYPE "GroupMemberStatus" AS ENUM ('active', 'pending', 'invited', 'banned', 'removed');

ALTER TABLE "profiles" ALTER COLUMN "visibility" DROP DEFAULT;
ALTER TABLE "profiles" ALTER COLUMN "visibility" TYPE "ProfileVisibility" USING "visibility"::"ProfileVisibility";
ALTER TABLE "profiles" ALTER COLUMN "visibility" SET DEFAULT 'alumni';

ALTER TABLE "alumni_verifications" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "alumni_verifications" ALTER COLUMN "status" TYPE "AlumniVerificationStatus" USING "status"::"AlumniVerificationStatus";
ALTER TABLE "alumni_verifications" ALTER COLUMN "status" SET DEFAULT 'pending';

ALTER TABLE "posts" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "posts" ALTER COLUMN "status" TYPE "PostStatus" USING "status"::"PostStatus";
ALTER TABLE "posts" ALTER COLUMN "status" SET DEFAULT 'visible';

ALTER TABLE "content_reports" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "content_reports" ALTER COLUMN "status" TYPE "ContentReportStatus" USING "status"::"ContentReportStatus";
ALTER TABLE "content_reports" ALTER COLUMN "status" SET DEFAULT 'open';

ALTER TABLE "events" ALTER COLUMN "visibility" DROP DEFAULT;
ALTER TABLE "events" ALTER COLUMN "visibility" TYPE "EventVisibility" USING "visibility"::"EventVisibility";
ALTER TABLE "events" ALTER COLUMN "visibility" SET DEFAULT 'school';

ALTER TABLE "events" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "events" ALTER COLUMN "status" TYPE "EventStatus" USING "status"::"EventStatus";
ALTER TABLE "events" ALTER COLUMN "status" SET DEFAULT 'published';

ALTER TABLE "event_rsvps" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "event_rsvps" ALTER COLUMN "status" TYPE "EventRsvpStatus" USING "status"::"EventRsvpStatus";
ALTER TABLE "event_rsvps" ALTER COLUMN "status" SET DEFAULT 'going';

ALTER TABLE "event_attendance" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "event_attendance" ALTER COLUMN "role" TYPE "EventAttendanceRole" USING "role"::"EventAttendanceRole";
ALTER TABLE "event_attendance" ALTER COLUMN "role" SET DEFAULT 'attendee';

ALTER TABLE "businesses" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "businesses" ALTER COLUMN "status" TYPE "BusinessStatus" USING "status"::"BusinessStatus";
ALTER TABLE "businesses" ALTER COLUMN "status" SET DEFAULT 'pending';

ALTER TABLE "groups" ALTER COLUMN "visibility" DROP DEFAULT;
ALTER TABLE "groups" ALTER COLUMN "visibility" TYPE "GroupVisibility" USING "visibility"::"GroupVisibility";
ALTER TABLE "groups" ALTER COLUMN "visibility" SET DEFAULT 'public';

ALTER TABLE "group_members" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "group_members" ALTER COLUMN "role" TYPE "GroupRole" USING "role"::"GroupRole";
ALTER TABLE "group_members" ALTER COLUMN "role" SET DEFAULT 'member';

ALTER TABLE "group_members" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "group_members" ALTER COLUMN "status" TYPE "GroupMemberStatus" USING "status"::"GroupMemberStatus";
ALTER TABLE "group_members" ALTER COLUMN "status" SET DEFAULT 'active';
