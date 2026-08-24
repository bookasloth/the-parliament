-- AlterTable: Vyapaar player stats
ALTER TABLE "users" ADD COLUMN "vyapaar_games_played" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "vyapaar_wins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "vyapaar_best_net_worth" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "vyapaar_match" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "seed" BIGINT NOT NULL,
    "state" JSONB NOT NULL,
    "action_log" JSONB NOT NULL DEFAULT '[]',
    "status" VARCHAR(10) NOT NULL DEFAULT 'active',
    "active_seat" INTEGER NOT NULL DEFAULT 0,
    "turn_expires_at" TIMESTAMPTZ,
    "winner_seat" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "ended_at" TIMESTAMPTZ,
    CONSTRAINT "vyapaar_match_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vyapaar_match_room_id_status_idx" ON "vyapaar_match"("room_id", "status");
CREATE INDEX "vyapaar_match_status_idx" ON "vyapaar_match"("status");

-- CreateTable
CREATE TABLE "vyapaar_match_player" (
    "match_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "seat" INTEGER NOT NULL,
    "opening_cash" INTEGER NOT NULL,
    "result_cash" INTEGER,
    "placement" INTEGER,
    CONSTRAINT "vyapaar_match_player_pkey" PRIMARY KEY ("match_id", "seat")
);

CREATE UNIQUE INDEX "vyapaar_match_player_match_id_user_id_key" ON "vyapaar_match_player"("match_id", "user_id");

ALTER TABLE "vyapaar_match" ADD CONSTRAINT "vyapaar_match_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "vyapaar_room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vyapaar_match_player" ADD CONSTRAINT "vyapaar_match_player_match_id_fkey"
    FOREIGN KEY ("match_id") REFERENCES "vyapaar_match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vyapaar_match_player" ADD CONSTRAINT "vyapaar_match_player_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
