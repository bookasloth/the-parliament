-- Member-raised blood requests (WhatsApp broadcast to compatible donors).
CREATE TABLE "blood_requests" (
    "id" UUID NOT NULL,
    "requester_id" UUID NOT NULL,
    "blood_group" VARCHAR(5) NOT NULL,
    "patient" VARCHAR(120) NOT NULL,
    "city" VARCHAR(120) NOT NULL,
    "hospital" VARCHAR(200) NOT NULL,
    "contact" VARCHAR(20) NOT NULL,
    "units_needed" INTEGER,
    "all_cities" BOOLEAN NOT NULL DEFAULT false,
    "donors_only" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "recipient_count" INTEGER NOT NULL DEFAULT 0,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "fulfilled_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blood_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "blood_requests_blood_group_city_status_idx" ON "blood_requests" ("blood_group", "city", "status");
CREATE INDEX "blood_requests_requester_id_created_at_idx" ON "blood_requests" ("requester_id", "created_at");
