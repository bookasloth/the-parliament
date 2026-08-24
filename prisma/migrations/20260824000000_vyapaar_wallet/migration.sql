-- AlterTable: Vyapaar wallet fields on users
ALTER TABLE "users" ADD COLUMN "vyapaar_wallet" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "vyapaar_granted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: append-only wallet ledger
CREATE TABLE "vyapaar_ledger" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" VARCHAR(60) NOT NULL,
    "ref_id" VARCHAR(120),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "vyapaar_ledger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vyapaar_ledger_user_id_created_at_idx" ON "vyapaar_ledger"("user_id", "created_at");

ALTER TABLE "vyapaar_ledger" ADD CONSTRAINT "vyapaar_ledger_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
