# Social-Parity Audit — Manual / Infra Follow-Ups

Companion to `2026-09-07-social-platform-parity-audit.md`. Everything below is what **cannot** be finished in code alone — it needs an infra change, a product decision, or a prod check only you can run. Code-only items are already shipped/PR'd (see the bottom).

---

## 1. Leak 3 — private media on public storage URLs (the remaining P0)

**Problem.** One *public* Supabase bucket (`avatars`) serves everything via `/storage/v1/object/public/…` — including DM images (`messages/`), comment images (`comments/`), and images on `followers`/`groups`-scoped posts. Anyone with the URL can fetch them (no auth, no expiry, no revocation). Filenames are 64-bit-random so it's not enumerable, but the URLs are permanent capability links.

**Why it's not code-only.** A real fix needs a *private* bucket, which only exists once you create it in the Supabase dashboard — and flipping the current bucket to private would break every existing avatar/gallery image.

### What YOU do
1. **Supabase dashboard → Storage → New bucket** → name it `private-media`, leave **Public** unchecked. (Same `SUPABASE_SERVICE_ROLE_KEY` covers it.)
2. **Decide the migration policy for existing objects** (pick one):
   - **(a) New-only** — only new uploads go private; existing DM/comment images stay at their current public URLs. Fast, but old objects remain exposed (exposure stops growing).
   - **(b) Full migrate** — a one-off script copies existing `messages/` + `comments/` objects into `private-media` and rewrites the stored URLs in `messages.media` / `comments.image_url`. Full closure; more work.
3. Tell me which, and that the bucket exists.

### What I do (once the bucket exists)
- Signed-URL helper for the private bucket (Supabase `createSignedUrl`, short TTL) + R2 equivalent.
- Retarget `uploadMessageImage` / `uploadCommentImage` (and followers-scoped post media) to `private-media`.
- A `canView`-checked resolver route `/api/media/[...]` — participant for DM images, follower/author for followers-post images — that issues a fresh signed URL; render paths resolve through it.
- (If you picked (b)) the migration script.

---

## 2. Dependabot vulnerabilities

`npm audit` locally shows 4 (GitHub reported 6 on `master` — the extra 2 are likely workflow/dev-only; check the Dependabot alerts page for the exact list).

| Package | Severity | Status / action |
|---|---|---|
| `browserslist` (≤4.28.6) | high | **Auto-fixed** — safe semver bump, in the deps PR below. |
| `fast-uri` (3.0.0–3.1.5) | high | **Auto-fixed** — safe semver bump, in the deps PR below. |
| `mysql2` (≤3.23.0) | high | **Do NOT auto-fix.** npm's only "fix" is `prisma@6.19.3` — a **major downgrade** of Prisma from your 7.x, which would break the app (`npm audit fix --force` is wrong here). `mysql2` is a transitive dep and this project is **Postgres-only** (no MySQL driver in use), so the vuln isn't reachable. **Action:** leave it; bump when a Prisma 7.x patch pulls a patched `mysql2`. Optionally I can add a package.json `overrides` to force a patched `mysql2` within a Prisma-7-compatible range — say the word and I'll test it. |
| `prisma` (moderate) | moderate | Same as above — the suggested "fix" is the 6.19.3 downgrade. Ignore; keep Prisma 7.x. |

**Never run `npm audit fix --force` here** — it downgrades Prisma.

---

## 3. Prod liveness checks (audit "Unknowns" — verify, don't assume)

These features silently no-op / degrade if their env isn't set in Vercel prod. Confirm each:

- **Web push** — `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` set? If not, push is a silent no-op (bell still works, no OS notifications).
- **Realtime (DM + notification bell)** — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` set? If not, messaging/notifications silently fall back to 60s / 5-min polling.
- **Search trigram indexes** — migrations `20260801020000_directory_search_indexes` and `20260902100000_search_indexes` are `IF NOT EXISTS`; confirm they actually applied on prod, else search is a sequential scan. Check on Supabase:
  ```sql
  SELECT indexname FROM pg_indexes
  WHERE indexname LIKE '%trgm%' OR indexname LIKE '%search%';
  ```

---

## 4. Poll migration drift (in progress elsewhere)

Being fixed in the spawned session `task_a6295964`. Migrations create `poll_options.post_id` but schema + an FK migration expect `poll_id`, so a fresh `migrate deploy` can't build a poll-capable DB (prod is hand-patched). When that lands, re-add the removed regression test `tests/integration/feed-visibility.itest.ts` (asserts CP0-1/CP0-2 at the query layer). **Prod SQL for this must be handed to you to run manually — do not migrate prod from code.**

---

## Already done in code (no action needed)

- **CP0-1 / CP0-2 / CP0-4** — merged to `master` (PR #429).
- **Residual privacy P1s** — mention-feed group leak, `/network` bot+block filter, report-action rate limit — in PR `fix/social-parity-p1-followups`.
- **`browserslist` + `fast-uri`** — in the deps PR.
- This audit + these instructions committed under `docs/audits/`.
