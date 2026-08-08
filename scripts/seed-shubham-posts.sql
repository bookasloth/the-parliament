-- Seed posts for user "shubham" about recent PRs/features
-- Run on Supabase SQL Editor
--
-- Prerequisites: shubham's user ID + school ID + a "career_update" category ID.
-- This script looks them up dynamically.

DO $$
DECLARE
  v_user_id   UUID;
  v_school_id UUID;
  v_cat_update UUID;
  v_cat_achieve UUID;
  v_cat_startup UUID;
  v_cat_memory UUID;
BEGIN
  -- Find shubham's user (by email or username containing 'shubham')
  SELECT id INTO v_user_id
    FROM users
    WHERE email = 'sndatarkar@gmail.com'
    LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User shubham not found — check email';
  END IF;

  -- School
  SELECT id INTO v_school_id FROM schools LIMIT 1;

  -- Categories
  SELECT id INTO v_cat_update  FROM post_categories WHERE key = 'career_update' AND school_id = v_school_id;
  SELECT id INTO v_cat_achieve FROM post_categories WHERE key = 'achievement'   AND school_id = v_school_id;
  SELECT id INTO v_cat_startup FROM post_categories WHERE key = 'startup'       AND school_id = v_school_id;
  SELECT id INTO v_cat_memory  FROM post_categories WHERE key = 'school_memory' AND school_id = v_school_id;

  -- Post 1: Video Calling (LiveKit)
  INSERT INTO posts (id, school_id, author_id, category_id, format, body, visibility_scope, upvote_count, comment_count, created_at)
  VALUES (
    gen_random_uuid(), v_school_id, v_user_id, v_cat_achieve, 'text',
    E'🎥 Video calling is LIVE on The Parliament!\n\nBuilt 1:1 video huddles using LiveKit — connect face-to-face with fellow Navodayans right from the chat window. Students get a ₹30 day-pass, premium members get unlimited calls.\n\nCamera, mic, screen share — the works. No third-party app needed.\n\n#TheParliament #VideoChat #JNVNagpur',
    'network', 24, 5,
    NOW() - INTERVAL '2 hours'
  );

  -- Post 2: Web Push Notifications
  INSERT INTO posts (id, school_id, author_id, category_id, format, body, visibility_scope, upvote_count, comment_count, created_at)
  VALUES (
    gen_random_uuid(), v_school_id, v_user_id, v_cat_update, 'text',
    E'🔔 Never miss a message again — Web Push notifications are here!\n\nGet instant browser notifications for incoming calls, new messages, reactions, and connection requests. Even when The Parliament tab is closed.\n\nEnable it from Settings → Notifications. Works on Chrome, Edge, Firefox.\n\n#WebPush #Notifications #NNAWCA',
    'network', 18, 3,
    NOW() - INTERVAL '6 hours'
  );

  -- Post 3: Marketing Homepage
  INSERT INTO posts (id, school_id, author_id, category_id, format, body, visibility_scope, upvote_count, comment_count, created_at)
  VALUES (
    gen_random_uuid(), v_school_id, v_user_id, v_cat_startup, 'text',
    E'🏠 Our landing page just got a major upgrade!\n\nThe homepage now pulls REAL data — actual alumni count, live event stats, genuine testimonials from our members. No more placeholder text.\n\nIf you haven''t visited the homepage recently, check it out. It tells our story with real numbers now.\n\n#Homepage #DataDriven #AlumniNetwork',
    'network', 31, 7,
    NOW() - INTERVAL '12 hours'
  );

  -- Post 4: Dead Code Cleanup
  INSERT INTO posts (id, school_id, author_id, category_id, format, body, visibility_scope, upvote_count, comment_count, created_at)
  VALUES (
    gen_random_uuid(), v_school_id, v_user_id, v_cat_update, 'text',
    E'🧹 Spring cleaning complete!\n\nJust removed all dead code from the platform — files with zero imports, unused exports, orphaned components. Lighter bundle, faster builds.\n\nThe best code is the code you delete. Our codebase thanks us.\n\n#CodeCleanup #Performance #DevLife',
    'network', 15, 2,
    NOW() - INTERVAL '1 day'
  );

  -- Post 5: Daily Digest Emails
  INSERT INTO posts (id, school_id, author_id, category_id, format, body, visibility_scope, upvote_count, comment_count, created_at)
  VALUES (
    gen_random_uuid(), v_school_id, v_user_id, v_cat_achieve, 'text',
    E'📧 "What You Missed" daily digest is now rolling out!\n\nEvery morning, you''ll get a beautiful email summary — trending posts, unread messages, upcoming events, new connections. Designed to bring you back to the community without spamming.\n\nBuilt with our custom email system (Poppins font, NNAWCA branding, dark mode friendly).\n\n#EmailDigest #StayConnected #NNAWCA',
    'network', 27, 6,
    NOW() - INTERVAL '1 day 6 hours'
  );

  -- Post 6: Global Incoming Call Ring
  INSERT INTO posts (id, school_id, author_id, category_id, format, body, visibility_scope, upvote_count, comment_count, created_at)
  VALUES (
    gen_random_uuid(), v_school_id, v_user_id, v_cat_update, 'text',
    E'📞 Incoming calls now ring on ANY page!\n\nBefore: you had to be in the chat to see an incoming call. Now: a call notification pops up wherever you are on The Parliament — feed, profile, directory, anywhere.\n\nNever miss a call from a fellow Navodayan again.\n\n#VideoCalling #UX #TheParliament',
    'network', 20, 4,
    NOW() - INTERVAL '2 days'
  );

  -- Post 7: Messaging System
  INSERT INTO posts (id, school_id, author_id, category_id, format, body, visibility_scope, upvote_count, comment_count, created_at)
  VALUES (
    gen_random_uuid(), v_school_id, v_user_id, v_cat_achieve, 'text',
    E'💬 Direct messaging is LIVE!\n\nYou can now DM any alumni on the platform. Start a conversation from their profile or the messages page. Desktop shows the chat list + conversation side by side; mobile has a clean separate view.\n\nThis is just Slice 1 — real-time delivery with Supabase is coming next. But polling works great for now.\n\n#Messaging #DMs #AlumniConnect',
    'network', 45, 12,
    NOW() - INTERVAL '3 days'
  );

  -- Post 8: Admin Console Dark Redesign
  INSERT INTO posts (id, school_id, author_id, category_id, format, body, visibility_scope, upvote_count, comment_count, created_at)
  VALUES (
    gen_random_uuid(), v_school_id, v_user_id, v_cat_startup, 'text',
    E'🌑 The admin console got a complete dark-mode redesign!\n\nSeparate login for admins (admin@nnawca.com), sleek dark theme (#0a0a0a bg), Poppins typography, Phosphor duotone icons, blue-600 accent. Dashboard, user management, verification, moderation, events, groups, membership, karma — all rebuilt.\n\nDistinct from the member app by design. Admin experience should feel like mission control.\n\n#AdminConsole #DarkMode #NNAWCA',
    'network', 33, 9,
    NOW() - INTERVAL '4 days'
  );

  RAISE NOTICE 'Seeded 8 posts for shubham about recent PRs';
END $$;
