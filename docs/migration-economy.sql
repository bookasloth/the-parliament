-- Economy: Eggs + Shell tables + User balance columns
-- Run on Supabase SQL Editor. Then run `prisma migrate resolve --applied <name>` to mark it.

-- 1. Add balance columns to users
ALTER TABLE "users" ADD COLUMN "egg_balance" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "users" ADD COLUMN "shell_balance" INTEGER NOT NULL DEFAULT 0;

-- 2. Egg throws log
CREATE TABLE "egg_throws" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "thrower_id" UUID NOT NULL,
  "target_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "egg_throws_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "egg_throws_thrower_id_fkey" FOREIGN KEY ("thrower_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "egg_throws_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "egg_throws_thrower_id_created_at_idx" ON "egg_throws"("thrower_id", "created_at");
CREATE INDEX "egg_throws_target_id_idx" ON "egg_throws"("target_id");

-- 3. Shell ledger
CREATE TABLE "shell_ledger" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "delta" INTEGER NOT NULL,
  "reason" VARCHAR(60) NOT NULL,
  "ref_id" VARCHAR(120),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "shell_ledger_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "shell_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "shell_ledger_user_id_created_at_idx" ON "shell_ledger"("user_id", "created_at");
