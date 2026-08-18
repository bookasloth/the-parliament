-- Add RBAC roles `support` and `analyst` to the AdminRole enum.
-- Forward-only. Rollback note: Postgres cannot DROP a single enum value; a
-- rollback would require recreating the type without these values and re-casting
-- the user_roles.role column — only do that if no rows use them.
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'analyst';
