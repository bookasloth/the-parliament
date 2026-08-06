-- System groups: one per batch (all, even empty), one per house, one per gender,
-- one per blood group. Idempotent — safe to re-run; only inserts what's missing.
-- Admin/creator: sndatarkar@gmail.com. Run manually in the Supabase SQL editor.

-- 1) One group per BATCH (every batch row, even with zero members)
INSERT INTO groups (id, school_id, type, name, description, visibility, is_permanent, ref_batch_id, created_by, created_at)
SELECT gen_random_uuid(), b.school_id, 'batch',
       'Batch ' || b.start_year || '–' || b.end_year,
       'Official group for the ' || b.start_year || '–' || b.end_year || ' batch.',
       'public', true, b.id,
       (SELECT id FROM users WHERE email = 'sndatarkar@gmail.com'),
       now()
FROM batches b
WHERE NOT EXISTS (SELECT 1 FROM groups g WHERE g.ref_batch_id = b.id);

-- 2) One group per HOUSE
INSERT INTO groups (id, school_id, type, name, description, visibility, is_permanent, ref_house_id, created_by, created_at)
SELECT gen_random_uuid(), h.school_id, 'house',
       h.name || ' House',
       'Official group for ' || h.name || ' House.',
       'public', true, h.id,
       (SELECT id FROM users WHERE email = 'sndatarkar@gmail.com'),
       now()
FROM houses h
WHERE NOT EXISTS (SELECT 1 FROM groups g WHERE g.ref_house_id = h.id);

-- 3) One group per GENDER + one per BLOOD GROUP.
-- No dedicated ref column exists, so ref_department carries a stable key
-- (unique per school) for idempotency.
INSERT INTO groups (id, school_id, type, name, description, visibility, is_permanent, ref_department, created_by, created_at)
SELECT gen_random_uuid(), s.id, v.type, v.name, v.descr, 'public', true, v.key, u.id, now()
FROM (VALUES
  ('gender', 'Male Alumni',    'Alumni network for male members.',                  'gender:male'),
  ('gender', 'Female Alumni',  'Alumni network for female members.',                'gender:female'),
  ('gender', 'Other Alumni',   'Alumni network open to all gender identities.',      'gender:other'),
  ('blood',  'Blood Group A+',  'Donors and seekers with A+ blood.',                'blood:A+'),
  ('blood',  'Blood Group A−',  'Donors and seekers with A− blood.',                'blood:A-'),
  ('blood',  'Blood Group B+',  'Donors and seekers with B+ blood.',                'blood:B+'),
  ('blood',  'Blood Group B−',  'Donors and seekers with B− blood.',                'blood:B-'),
  ('blood',  'Blood Group O+',  'Donors and seekers with O+ blood.',                'blood:O+'),
  ('blood',  'Blood Group O−',  'Donors and seekers with O− blood.',                'blood:O-'),
  ('blood',  'Blood Group AB+', 'Donors and seekers with AB+ blood.',               'blood:AB+'),
  ('blood',  'Blood Group AB−', 'Donors and seekers with AB− blood.',               'blood:AB-')
) AS v(type, name, descr, key)
CROSS JOIN (SELECT id FROM schools WHERE name = 'Jawahar Navodaya Vidyalaya, Navegaon Khairi, Nagpur') s
CROSS JOIN (SELECT id FROM users WHERE email = 'sndatarkar@gmail.com') u
WHERE NOT EXISTS (
  SELECT 1 FROM groups g WHERE g.school_id = s.id AND g.ref_department = v.key
);

-- Verify
SELECT type, count(*) FROM groups GROUP BY type ORDER BY type;
