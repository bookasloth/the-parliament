-- Alfazy: daily word game additions.
-- game_scores gains solved + puzzle_date, and a one-play-per-user-per-day unique.
-- (games / game_scores base tables already exist from the init migration.)

ALTER TABLE "game_scores" ADD COLUMN "solved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "game_scores" ADD COLUMN "puzzle_date" DATE NOT NULL DEFAULT CURRENT_DATE;
-- drop the default now that the column exists; app always supplies puzzle_date.
ALTER TABLE "game_scores" ALTER COLUMN "puzzle_date" DROP DEFAULT;

CREATE UNIQUE INDEX "game_scores_game_id_user_id_puzzle_date_key"
  ON "game_scores" ("game_id", "user_id", "puzzle_date");
CREATE INDEX "game_scores_game_id_puzzle_date_idx"
  ON "game_scores" ("game_id", "puzzle_date");

-- Word dictionary. Daily puzzle = row where idx = (daysSinceLaunch % activeCount).
CREATE TABLE "alfazy_words" (
    "id" UUID NOT NULL,
    "idx" INTEGER NOT NULL,
    "word" VARCHAR(5) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "alfazy_words_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "alfazy_words_idx_key" ON "alfazy_words" ("idx");
CREATE UNIQUE INDEX "alfazy_words_word_key" ON "alfazy_words" ("word");
CREATE INDEX "alfazy_words_is_active_idx_idx" ON "alfazy_words" ("is_active", "idx");

-- Frozen period champions (ties = multiple rows per anchor = co-champions).
CREATE TABLE "game_champions" (
    "game_id" UUID NOT NULL,
    "scope" VARCHAR(12) NOT NULL,
    "period" VARCHAR(12) NOT NULL,
    "anchor" VARCHAR(16) NOT NULL,
    "winner_key" UUID NOT NULL,
    "winner_label" VARCHAR(120) NOT NULL,
    "total_score" INTEGER NOT NULL,
    "decided_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_champions_pkey" PRIMARY KEY ("game_id", "scope", "period", "anchor", "winner_key")
);
CREATE INDEX "game_champions_scope_period_idx" ON "game_champions" ("scope", "period");
CREATE INDEX "game_champions_winner_key_idx" ON "game_champions" ("winner_key");

ALTER TABLE "game_champions" ADD CONSTRAINT "game_champions_game_id_fkey"
  FOREIGN KEY ("game_id") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
