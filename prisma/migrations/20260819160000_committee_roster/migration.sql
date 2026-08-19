-- Public committee roster (distinct from operational committee_members).

CREATE TABLE "committee_roster" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "position" VARCHAR(80) NOT NULL,
    "group_type" VARCHAR(20) NOT NULL DEFAULT 'executive',
    "profile_link" TEXT,
    "email" VARCHAR(254),
    "phone" VARCHAR(20),
    "photo_url" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "committee_roster_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "committee_roster_group_type_is_published_display_order_idx"
    ON "committee_roster"("group_type", "is_published", "display_order");

-- Seed with the current roster so /committee keeps rendering. Executive names
-- are placeholders — edit them in /admin/committee-roster.
INSERT INTO "committee_roster" ("name", "position", "group_type", "email", "display_order") VALUES
  ('Prince Jiwani Khoja', 'President',        'executive', 'president@nnawca.org',       0),
  ('Aditya Rane',         'Vice President',   'executive', 'vicepresident@nnawca.org',   1),
  ('Sameer Kulkarni',     'General Secretary','executive', 'secretary@nnawca.org',       2),
  ('Rohit Deshpande',     'Joint Secretary',  'executive', 'jointsecretary@nnawca.org',  3),
  ('Nikhil Warhade',      'Treasurer',        'executive', 'treasurer@nnawca.org',       4),
  ('Amol Thakre',         'Joint Treasurer',  'executive', 'jointtreasurer@nnawca.org',  5),
  ('Vishal Gaikwad',      'Executive Member', 'executive', NULL, 6),
  ('Kiran Sonkusare',     'Executive Member', 'executive', NULL, 7),
  ('Anjali Deshmukh',     'Executive Member', 'executive', NULL, 8),
  ('Sneha Pawar',         'Executive Member', 'executive', NULL, 9);

INSERT INTO "committee_roster" ("name", "position", "group_type", "display_order") VALUES
  ('Shri. Chandrashekhar Gotmare', 'Ex President',         'advisory', 0),
  ('Shri. Pushpaketan Chouragade', 'Ex Vice President',    'advisory', 1),
  ('Shri. Mahendra Shende',        'Ex General Secretary', 'advisory', 2),
  ('Shri. Prashant Bodkhe',        'Ex Joint Secretary',   'advisory', 3),
  ('Shri. Prakash Nare',           'Ex Treasurer',         'advisory', 4),
  ('Shri. Pandurang Gavkhare',     'Ex Member',            'advisory', 5),
  ('Shri. Pravin Dongare',         'Ex Member',            'advisory', 6),
  ('Smt. Megha Amrute',            'Ex Member',            'advisory', 7),
  ('Shri. Ratnapal Bhandare',      'Ex Member',            'advisory', 8),
  ('Smt. Shilpa Borkar',           'Ex Member',            'advisory', 9),
  ('Shri. Shubham Bansod',         'Ex Member',            'advisory', 10);
