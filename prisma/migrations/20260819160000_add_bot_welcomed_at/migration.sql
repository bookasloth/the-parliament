-- Marks when the NNAWCA bot has welcomed a member, so the welcome fires exactly
-- once across its triggers (onboarding-complete + first sign-in) and never
-- retro-fires. Nullable: every existing member is left unmarked, so anyone
-- registered-but-not-yet-welcomed gets the welcome on their next (first) login.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bot_welcomed_at" TIMESTAMPTZ;
