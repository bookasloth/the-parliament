-- CreateTable
CREATE TABLE "flag_challenges" (
    "id" UUID NOT NULL,
    "post_id" UUID,
    "school_id" UUID NOT NULL,
    "country_code" VARCHAR(2) NOT NULL,
    "country_name" VARCHAR(100) NOT NULL,
    "scheduled_for" DATE NOT NULL,
    "submission_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flag_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flag_submissions" (
    "user_id" UUID NOT NULL,
    "challenge_id" UUID NOT NULL,
    "image_key" VARCHAR(500) NOT NULL,
    "score" INTEGER NOT NULL,
    "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flag_submissions_pkey" PRIMARY KEY ("user_id","challenge_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "flag_challenges_post_id_key" ON "flag_challenges"("post_id");

-- CreateIndex
CREATE INDEX "flag_challenges_post_id_idx" ON "flag_challenges"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "flag_challenges_school_id_scheduled_for_key" ON "flag_challenges"("school_id", "scheduled_for");

-- CreateIndex
CREATE INDEX "flag_submissions_challenge_id_idx" ON "flag_submissions"("challenge_id");

-- AddForeignKey
ALTER TABLE "flag_challenges" ADD CONSTRAINT "flag_challenges_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flag_challenges" ADD CONSTRAINT "flag_challenges_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flag_submissions" ADD CONSTRAINT "flag_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flag_submissions" ADD CONSTRAINT "flag_submissions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "flag_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
