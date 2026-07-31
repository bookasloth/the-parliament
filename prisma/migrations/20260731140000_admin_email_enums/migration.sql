-- Enums batch 4: admin roles + email status. Both tables empty on prod.
--
-- PROD PREFLIGHT:
--   SELECT DISTINCT role FROM user_roles;      -- super_admin/admin/moderator
--   SELECT DISTINCT status FROM email_messages; -- queued/sent/failed/bounced/delivered

CREATE TYPE "AdminRole" AS ENUM ('super_admin', 'admin', 'moderator');
CREATE TYPE "EmailStatus" AS ENUM ('queued', 'sent', 'failed', 'bounced', 'delivered');

-- role is part of the user_roles composite PK; ALTER TYPE rebuilds the index.
ALTER TABLE "user_roles" ALTER COLUMN "role" TYPE "AdminRole" USING "role"::"AdminRole";

ALTER TABLE "email_messages" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "email_messages" ALTER COLUMN "status" TYPE "EmailStatus" USING "status"::"EmailStatus";
ALTER TABLE "email_messages" ALTER COLUMN "status" SET DEFAULT 'queued';
