-- CreateTable
CREATE TABLE "schools" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "houses" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "color_name" VARCHAR(30) NOT NULL,
    "color_hex" CHAR(7) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "houses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "divisions" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "divisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "start_year" INTEGER NOT NULL,
    "end_year" INTEGER NOT NULL,
    "label" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "email" VARCHAR NOT NULL,
    "email_verified_at" TIMESTAMPTZ,
    "mobile_e164" VARCHAR(20),
    "mobile_verified_at" TIMESTAMPTZ,
    "password_hash" TEXT,
    "legal_name" VARCHAR(160) NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "member_type" VARCHAR(20) NOT NULL,
    "date_of_birth" DATE,
    "current_class" INTEGER,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_credentials" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "provider_uid" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip_inet" TEXT,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "rotated_from" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_factors" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "secret_enc" TEXT,
    "confirmed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" VARCHAR(30) NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "consumed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "user_id" UUID NOT NULL,
    "photo_url" TEXT,
    "bio" TEXT,
    "house_id" UUID,
    "batch_id" UUID,
    "department" VARCHAR(120),
    "city" VARCHAR(120),
    "profession" VARCHAR(160),
    "company" VARCHAR(160),
    "industry" VARCHAR(120),
    "headline" VARCHAR(200),
    "social_links" JSONB NOT NULL DEFAULT '{}',
    "whatsapp_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "visibility" VARCHAR(20) NOT NULL DEFAULT 'alumni',
    "is_public_indexed" BOOLEAN NOT NULL DEFAULT false,
    "show_on_map" BOOLEAN NOT NULL DEFAULT false,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "contact_always_share" BOOLEAN NOT NULL DEFAULT false,
    "connection_auto_accept" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_divisions" (
    "user_id" UUID NOT NULL,
    "division_id" UUID NOT NULL,
    "is_protected" BOOLEAN NOT NULL DEFAULT false,
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_divisions_pkey" PRIMARY KEY ("user_id","division_id")
);

-- CreateTable
CREATE TABLE "alumni_verifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "method" VARCHAR(30) NOT NULL,
    "evidence_url" TEXT,
    "institute_email" VARCHAR,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ,
    "reject_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alumni_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role" VARCHAR(30) NOT NULL,
    "granted_by" UUID,
    "granted_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role")
);

-- CreateTable
CREATE TABLE "connections" (
    "id" UUID NOT NULL,
    "requester_id" UUID NOT NULL,
    "addressee_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "auto_accepted" BOOLEAN NOT NULL DEFAULT false,
    "contact_exchanged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMPTZ,

    CONSTRAINT "connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_blocks" (
    "blocker_id" UUID NOT NULL,
    "blocked_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("blocker_id","blocked_id")
);

-- CreateTable
CREATE TABLE "post_categories" (
    "id" UUID NOT NULL,
    "school_id" UUID,
    "key" VARCHAR(40) NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "post_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "group_id" UUID,
    "category_id" UUID NOT NULL,
    "format" VARCHAR(20) NOT NULL DEFAULT 'text',
    "body" TEXT,
    "media" JSONB NOT NULL DEFAULT '[]',
    "link_url" TEXT,
    "visibility_scope" VARCHAR(20) NOT NULL DEFAULT 'network',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "edited_at" TIMESTAMPTZ,
    "quality_score" DECIMAL(8,3) NOT NULL DEFAULT 0,
    "engagement_score" DECIMAL(8,3) NOT NULL DEFAULT 0,
    "report_penalty" DECIMAL(8,3) NOT NULL DEFAULT 0,
    "ranking_score" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'visible',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_mentions" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "mention_type" VARCHAR(10) NOT NULL,
    "user_id" UUID,
    "house_id" UUID,
    "batch_id" UUID,

    CONSTRAINT "post_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_shares" (
    "id" UUID NOT NULL,
    "original_post_id" UUID NOT NULL,
    "sharer_id" UUID NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spotlights" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "subject_type" VARCHAR(12) NOT NULL,
    "subject_id" UUID NOT NULL,
    "headline" VARCHAR(200),
    "curated_by" UUID,
    "active_from" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active_to" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spotlights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "parent_id" UUID,
    "body" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "entity_type" VARCHAR(20) NOT NULL,
    "entity_id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_reports" (
    "id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "entity_type" VARCHAR(20) NOT NULL,
    "entity_id" UUID NOT NULL,
    "reason" VARCHAR(40) NOT NULL,
    "details" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "resolved_by" UUID,
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversation_id","user_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardian_consents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "guardian_name" VARCHAR(160) NOT NULL,
    "guardian_email" VARCHAR,
    "guardian_phone" VARCHAR(20),
    "consented_at" TIMESTAMPTZ,
    "method" VARCHAR(30),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guardian_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_karma" (
    "user_id" UUID NOT NULL,
    "karma_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "earned_karma_30d" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lifetime_earned" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "computed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_karma_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "karma_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "counterparty_id" UUID,
    "role" VARCHAR(12) NOT NULL,
    "action_type" VARCHAR(40) NOT NULL,
    "base_value" DECIMAL(8,2) NOT NULL,
    "applied_value" DECIMAL(8,2) NOT NULL,
    "reason_code" VARCHAR(40),
    "entity_type" VARCHAR(20),
    "entity_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "karma_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "karma_daily_counters" (
    "user_id" UUID NOT NULL,
    "day_ist" DATE NOT NULL,
    "likes_made" INTEGER NOT NULL DEFAULT 0,
    "comments_made" INTEGER NOT NULL DEFAULT 0,
    "shares_made" INTEGER NOT NULL DEFAULT 0,
    "net_karma" DECIMAL(8,2) NOT NULL DEFAULT 0,

    CONSTRAINT "karma_daily_counters_pkey" PRIMARY KEY ("user_id","day_ist")
);

-- CreateTable
CREATE TABLE "karma_pair_daily" (
    "actor_id" UUID NOT NULL,
    "target_id" UUID NOT NULL,
    "day_ist" DATE NOT NULL,
    "positive_given" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "likes_given" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "karma_pair_daily_pkey" PRIMARY KEY ("actor_id","target_id","day_ist")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "host_id" UUID NOT NULL,
    "group_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ,
    "mode" VARCHAR(20) NOT NULL,
    "venue" VARCHAR(240),
    "online_url" TEXT,
    "host_house_id" UUID,
    "is_house_specific" BOOLEAN NOT NULL DEFAULT false,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "visibility" VARCHAR(20) NOT NULL DEFAULT 'school',
    "status" VARCHAR(20) NOT NULL DEFAULT 'published',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_rsvps" (
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" VARCHAR(12) NOT NULL DEFAULT 'going',
    "rsvp_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_rsvps_pkey" PRIMARY KEY ("event_id","user_id")
);

-- CreateTable
CREATE TABLE "event_attendance" (
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'attendee',
    "checked_in_at" TIMESTAMPTZ,

    CONSTRAINT "event_attendance_pkey" PRIMARY KEY ("event_id","user_id")
);

-- CreateTable
CREATE TABLE "event_feedback" (
    "event_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_feedback_pkey" PRIMARY KEY ("event_id","user_id")
);

-- CreateTable
CREATE TABLE "business_categories" (
    "id" UUID NOT NULL,
    "school_id" UUID,
    "key" VARCHAR(40) NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "business_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "logo_url" TEXT,
    "banner_url" TEXT,
    "website" TEXT,
    "contact_email" VARCHAR,
    "contact_phone" VARCHAR(20),
    "offers_alumni_discount" BOOLEAN NOT NULL DEFAULT false,
    "rating_avg" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_reviews" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "body" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "tier" VARCHAR(20) NOT NULL,
    "price_inr" INTEGER NOT NULL,
    "duration_days" INTEGER,
    "features" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "auto_pay" BOOLEAN NOT NULL DEFAULT false,
    "razorpay_subscription_id" VARCHAR(64),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" VARCHAR(20) NOT NULL,
    "amount_inr" INTEGER NOT NULL,
    "membership_id" UUID,
    "razorpay_order_id" VARCHAR(64),
    "razorpay_payment_id" VARCHAR(64),
    "status" VARCHAR(20) NOT NULL DEFAULT 'created',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "cause" VARCHAR(120),
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_items" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "category" VARCHAR(40) NOT NULL,
    "karma_cost" DECIMAL(8,2) NOT NULL,
    "quantity" INTEGER,
    "delivery_type" VARCHAR(20) NOT NULL,
    "asset_url" TEXT,
    "code_pool" JSONB,
    "eligibility" JSONB NOT NULL DEFAULT '{}',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "featured_until" TIMESTAMPTZ,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "karma_redemptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "reward_item_id" UUID NOT NULL,
    "karma_spent" DECIMAL(8,2) NOT NULL,
    "karma_transaction_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'fulfilled',
    "delivery_channel" VARCHAR(20),
    "delivered_url" TEXT,
    "delivered_code" VARCHAR(80),
    "delivered_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "karma_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" UUID NOT NULL,
    "school_id" UUID,
    "key" VARCHAR(40) NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "icon_url" TEXT,
    "auto_criteria" JSONB,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "user_id" UUID NOT NULL,
    "badge_id" UUID NOT NULL,
    "source" VARCHAR(20) NOT NULL DEFAULT 'auto',
    "awarded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("user_id","badge_id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "banner_url" TEXT,
    "visibility" VARCHAR(10) NOT NULL DEFAULT 'public',
    "is_permanent" BOOLEAN NOT NULL DEFAULT false,
    "ref_batch_id" UUID,
    "ref_house_id" UUID,
    "ref_department" VARCHAR(120),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "group_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(12) NOT NULL DEFAULT 'member',
    "status" VARCHAR(12) NOT NULL DEFAULT 'active',
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("group_id","user_id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "key" VARCHAR(40) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "genre" VARCHAR(20) NOT NULL,
    "mode" VARCHAR(12) NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_scores" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "level_reached" INTEGER,
    "karma_awarded" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "played_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_matches" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "matchKind" VARCHAR(12) NOT NULL,
    "tournament_id" UUID,
    "status" VARCHAR(12) NOT NULL DEFAULT 'pending',
    "started_at" TIMESTAMPTZ,
    "ended_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_participants" (
    "match_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "result" VARCHAR(12),
    "karma_awarded" DECIMAL(8,2) NOT NULL DEFAULT 0,

    CONSTRAINT "match_participants_pkey" PRIMARY KEY ("match_id","user_id")
);

-- CreateTable
CREATE TABLE "game_challenges" (
    "id" UUID NOT NULL,
    "game_id" UUID NOT NULL,
    "challenger_id" UUID NOT NULL,
    "opponent_id" UUID,
    "status" VARCHAR(12) NOT NULL DEFAULT 'open',
    "match_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "game_id" UUID,
    "name" VARCHAR(160) NOT NULL,
    "season" VARCHAR(40),
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "prize_badge_id" UUID,
    "prize_karma" DECIMAL(8,2),
    "status" VARCHAR(12) NOT NULL DEFAULT 'upcoming',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_entries" (
    "tournament_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "final_rank" INTEGER,
    "karma_awarded" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_entries_pkey" PRIMARY KEY ("tournament_id","user_id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" BIGSERIAL NOT NULL,
    "user_id" UUID,
    "event_type" VARCHAR(60) NOT NULL,
    "entity_type" VARCHAR(30),
    "entity_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_inet" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "houses_school_id_name_key" ON "houses"("school_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "divisions_school_id_name_key" ON "divisions"("school_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "batches_school_id_start_year_key" ON "batches"("school_id", "start_year");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_school_id_idx" ON "users"("school_id");

-- CreateIndex
CREATE INDEX "users_member_type_idx" ON "users"("member_type");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_credentials_provider_provider_uid_key" ON "user_credentials"("provider", "provider_uid");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refresh_token_hash_key" ON "user_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "mfa_factors_user_id_idx" ON "mfa_factors"("user_id");

-- CreateIndex
CREATE INDEX "verification_tokens_user_id_purpose_idx" ON "verification_tokens"("user_id", "purpose");

-- CreateIndex
CREATE INDEX "profiles_batch_id_idx" ON "profiles"("batch_id");

-- CreateIndex
CREATE INDEX "profiles_city_idx" ON "profiles"("city");

-- CreateIndex
CREATE INDEX "profiles_company_idx" ON "profiles"("company");

-- CreateIndex
CREATE INDEX "user_divisions_division_id_idx" ON "user_divisions"("division_id");

-- CreateIndex
CREATE INDEX "alumni_verifications_user_id_idx" ON "alumni_verifications"("user_id");

-- CreateIndex
CREATE INDEX "alumni_verifications_status_idx" ON "alumni_verifications"("status");

-- CreateIndex
CREATE INDEX "connections_addressee_id_status_idx" ON "connections"("addressee_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "connections_requester_id_addressee_id_key" ON "connections"("requester_id", "addressee_id");

-- CreateIndex
CREATE INDEX "user_blocks_blocked_id_idx" ON "user_blocks"("blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_categories_school_id_key_key" ON "post_categories"("school_id", "key");

-- CreateIndex
CREATE INDEX "posts_author_id_idx" ON "posts"("author_id");

-- CreateIndex
CREATE INDEX "posts_created_at_idx" ON "posts"("created_at");

-- CreateIndex
CREATE INDEX "posts_category_id_idx" ON "posts"("category_id");

-- CreateIndex
CREATE INDEX "posts_school_id_ranking_score_idx" ON "posts"("school_id", "ranking_score");

-- CreateIndex
CREATE INDEX "posts_school_id_engagement_score_idx" ON "posts"("school_id", "engagement_score");

-- CreateIndex
CREATE INDEX "posts_school_id_is_pinned_idx" ON "posts"("school_id", "is_pinned");

-- CreateIndex
CREATE INDEX "posts_group_id_created_at_idx" ON "posts"("group_id", "created_at");

-- CreateIndex
CREATE INDEX "post_mentions_post_id_idx" ON "post_mentions"("post_id");

-- CreateIndex
CREATE INDEX "post_shares_original_post_id_idx" ON "post_shares"("original_post_id");

-- CreateIndex
CREATE INDEX "spotlights_school_id_active_from_idx" ON "spotlights"("school_id", "active_from");

-- CreateIndex
CREATE INDEX "comments_post_id_idx" ON "comments"("post_id");

-- CreateIndex
CREATE INDEX "reactions_entity_type_entity_id_idx" ON "reactions"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "reactions_user_id_entity_type_entity_id_key" ON "reactions"("user_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "content_reports_entity_type_entity_id_idx" ON "content_reports"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_reports_reporter_id_entity_type_entity_id_key" ON "content_reports"("reporter_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "messages_sender_id_created_at_idx" ON "messages"("sender_id", "created_at");

-- CreateIndex
CREATE INDEX "user_karma_earned_karma_30d_idx" ON "user_karma"("earned_karma_30d");

-- CreateIndex
CREATE INDEX "user_karma_lifetime_earned_idx" ON "user_karma"("lifetime_earned");

-- CreateIndex
CREATE INDEX "karma_transactions_user_id_created_at_idx" ON "karma_transactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "karma_transactions_counterparty_id_user_id_created_at_idx" ON "karma_transactions"("counterparty_id", "user_id", "created_at");

-- CreateIndex
CREATE INDEX "events_school_id_starts_at_idx" ON "events"("school_id", "starts_at");

-- CreateIndex
CREATE INDEX "events_host_house_id_idx" ON "events"("host_house_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_categories_school_id_key_key" ON "business_categories"("school_id", "key");

-- CreateIndex
CREATE INDEX "businesses_category_id_idx" ON "businesses"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_reviews_business_id_reviewer_id_key" ON "business_reviews"("business_id", "reviewer_id");

-- CreateIndex
CREATE INDEX "memberships_user_id_status_idx" ON "memberships"("user_id", "status");

-- CreateIndex
CREATE INDEX "memberships_expires_at_idx" ON "memberships"("expires_at");

-- CreateIndex
CREATE INDEX "payments_user_id_created_at_idx" ON "payments"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "reward_items_school_id_is_active_category_idx" ON "reward_items"("school_id", "is_active", "category");

-- CreateIndex
CREATE INDEX "karma_redemptions_user_id_created_at_idx" ON "karma_redemptions"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "badges_school_id_key_key" ON "badges"("school_id", "key");

-- CreateIndex
CREATE INDEX "groups_school_id_type_idx" ON "groups"("school_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "groups_school_id_ref_batch_id_key" ON "groups"("school_id", "ref_batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "groups_school_id_ref_house_id_key" ON "groups"("school_id", "ref_house_id");

-- CreateIndex
CREATE UNIQUE INDEX "groups_school_id_ref_department_key" ON "groups"("school_id", "ref_department");

-- CreateIndex
CREATE INDEX "group_members_user_id_status_idx" ON "group_members"("user_id", "status");

-- CreateIndex
CREATE INDEX "game_scores_game_id_score_idx" ON "game_scores"("game_id", "score");

-- CreateIndex
CREATE INDEX "game_scores_user_id_played_at_idx" ON "game_scores"("user_id", "played_at");

-- CreateIndex
CREATE INDEX "activity_events_user_id_created_at_idx" ON "activity_events"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "activity_events_event_type_created_at_idx" ON "activity_events"("event_type", "created_at");

-- AddForeignKey
ALTER TABLE "houses" ADD CONSTRAINT "houses_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_rotated_from_fkey" FOREIGN KEY ("rotated_from") REFERENCES "user_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_factors" ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_house_id_fkey" FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_divisions" ADD CONSTRAINT "user_divisions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_divisions" ADD CONSTRAINT "user_divisions_division_id_fkey" FOREIGN KEY ("division_id") REFERENCES "divisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alumni_verifications" ADD CONSTRAINT "alumni_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connections" ADD CONSTRAINT "connections_addressee_id_fkey" FOREIGN KEY ("addressee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "post_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_mentions" ADD CONSTRAINT "post_mentions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_shares" ADD CONSTRAINT "post_shares_original_post_id_fkey" FOREIGN KEY ("original_post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_shares" ADD CONSTRAINT "post_shares_sharer_id_fkey" FOREIGN KEY ("sharer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spotlights" ADD CONSTRAINT "spotlights_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardian_consents" ADD CONSTRAINT "guardian_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_karma" ADD CONSTRAINT "user_karma_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karma_transactions" ADD CONSTRAINT "karma_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karma_daily_counters" ADD CONSTRAINT "karma_daily_counters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karma_pair_daily" ADD CONSTRAINT "karma_pair_daily_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karma_pair_daily" ADD CONSTRAINT "karma_pair_daily_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_host_house_id_fkey" FOREIGN KEY ("host_house_id") REFERENCES "houses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendance" ADD CONSTRAINT "event_attendance_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendance" ADD CONSTRAINT "event_attendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_feedback" ADD CONSTRAINT "event_feedback_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_feedback" ADD CONSTRAINT "event_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_categories" ADD CONSTRAINT "business_categories_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "business_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_reviews" ADD CONSTRAINT "business_reviews_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_reviews" ADD CONSTRAINT "business_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_items" ADD CONSTRAINT "reward_items_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karma_redemptions" ADD CONSTRAINT "karma_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "karma_redemptions" ADD CONSTRAINT "karma_redemptions_reward_item_id_fkey" FOREIGN KEY ("reward_item_id") REFERENCES "reward_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_ref_batch_id_fkey" FOREIGN KEY ("ref_batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_ref_house_id_fkey" FOREIGN KEY ("ref_house_id") REFERENCES "houses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_scores" ADD CONSTRAINT "game_scores_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_scores" ADD CONSTRAINT "game_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_matches" ADD CONSTRAINT "game_matches_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_matches" ADD CONSTRAINT "game_matches_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "game_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_challenges" ADD CONSTRAINT "game_challenges_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_challenges" ADD CONSTRAINT "game_challenges_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "game_matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_entries" ADD CONSTRAINT "tournament_entries_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_entries" ADD CONSTRAINT "tournament_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
