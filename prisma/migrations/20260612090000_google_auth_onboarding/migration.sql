-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_school_id_fkey";

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "city" VARCHAR(120);

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "banner_url" TEXT;

-- AlterTable
ALTER TABLE "houses" ADD COLUMN     "is_girls_only" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slogan" VARCHAR(200);

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "comment_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "downvote_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "share_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "upvote_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "logo_url" TEXT;

-- AlterTable
ALTER TABLE "user_credentials" ADD COLUMN     "access_token" TEXT,
ADD COLUMN     "expires_at" TIMESTAMPTZ,
ADD COLUMN     "refresh_token" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "connections_data" JSONB,
ADD COLUMN     "current_status" VARCHAR(20),
ADD COLUMN     "gender" VARCHAR(20),
ADD COLUMN     "membership_data" JSONB,
ADD COLUMN     "username" VARCHAR(60),
ADD COLUMN     "verification_data" JSONB,
ADD COLUMN     "years_studied" INTEGER,
ALTER COLUMN "school_id" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'active',
ALTER COLUMN "onboarding_step" SET DEFAULT 'profile';

-- CreateTable
CREATE TABLE "interests" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "icon" VARCHAR(40),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_interests" (
    "user_id" UUID NOT NULL,
    "interest_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_interests_pkey" PRIMARY KEY ("user_id","interest_id")
);

-- CreateTable
CREATE TABLE "onboarding_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "step" VARCHAR(30) NOT NULL DEFAULT 'profile',
    "data" JSONB NOT NULL DEFAULT '{}',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_posts" (
    "user_id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "saved_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_posts_pkey" PRIMARY KEY ("user_id","post_id")
);

-- CreateTable
CREATE TABLE "post_awards" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "award_type" VARCHAR(40) NOT NULL,
    "karma_cost" DECIMAL(8,2) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "post_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polls" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "question" VARCHAR(500) NOT NULL,
    "expires_at" TIMESTAMPTZ,
    "is_multiple" BOOLEAN NOT NULL DEFAULT false,
    "total_votes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_options" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "label" VARCHAR(200) NOT NULL,
    "vote_count" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_votes" (
    "user_id" UUID NOT NULL,
    "poll_id" UUID NOT NULL,
    "option_id" UUID NOT NULL,
    "voted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("user_id","poll_id")
);

-- CreateTable
CREATE TABLE "hashtags" (
    "id" UUID NOT NULL,
    "tag" VARCHAR(100) NOT NULL,
    "use_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hashtags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_hashtags" (
    "post_id" UUID NOT NULL,
    "hashtag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "post_hashtags_pkey" PRIMARY KEY ("post_id","hashtag_id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT,
    "entity_type" VARCHAR(30),
    "entity_id" UUID,
    "image_url" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "karma_thresholds" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "min_karma" DECIMAL(10,2) NOT NULL,
    "color" VARCHAR(20),
    "icon_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "karma_thresholds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "interests_slug_key" ON "interests"("slug");

-- CreateIndex
CREATE INDEX "interests_slug_idx" ON "interests"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_progress_user_id_key" ON "onboarding_progress"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "schools_slug_key" ON "schools"("slug");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_interest_id_fkey" FOREIGN KEY ("interest_id") REFERENCES "interests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
