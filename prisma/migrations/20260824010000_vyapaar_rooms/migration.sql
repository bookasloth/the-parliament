-- CreateTable
CREATE TABLE "vyapaar_room" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(6) NOT NULL,
    "host_id" UUID NOT NULL,
    "visibility" VARCHAR(10) NOT NULL DEFAULT 'private',
    "status" VARCHAR(10) NOT NULL DEFAULT 'open',
    "last_active_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "vyapaar_room_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vyapaar_room_code_key" ON "vyapaar_room"("code");
CREATE INDEX "vyapaar_room_status_visibility_last_active_at_idx" ON "vyapaar_room"("status", "visibility", "last_active_at");
CREATE INDEX "vyapaar_room_status_last_active_at_idx" ON "vyapaar_room"("status", "last_active_at");

-- CreateTable
CREATE TABLE "vyapaar_room_member" (
    "room_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "seat" INTEGER NOT NULL,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "vyapaar_room_member_pkey" PRIMARY KEY ("room_id", "user_id")
);

CREATE UNIQUE INDEX "vyapaar_room_member_room_id_seat_key" ON "vyapaar_room_member"("room_id", "seat");

ALTER TABLE "vyapaar_room" ADD CONSTRAINT "vyapaar_room_host_id_fkey"
    FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vyapaar_room_member" ADD CONSTRAINT "vyapaar_room_member_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "vyapaar_room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vyapaar_room_member" ADD CONSTRAINT "vyapaar_room_member_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
