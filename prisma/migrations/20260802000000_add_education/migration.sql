-- Multi-entry education history (mirrors experiences). Additive, new table only.
CREATE TABLE "educations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "school" VARCHAR(200) NOT NULL,
    "degree" VARCHAR(160),
    "field_of_study" VARCHAR(160),
    "start_year" INTEGER,
    "end_year" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "educations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "educations_user_id_end_year_idx" ON "educations"("user_id", "end_year");

ALTER TABLE "educations" ADD CONSTRAINT "educations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
