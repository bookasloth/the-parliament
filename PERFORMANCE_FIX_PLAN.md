# Performance Fix Plan — The Parliament (NNAWCA)

Companion to [PERFORMANCE_AUDIT.md](PERFORMANCE_AUDIT.md). Phased so the biggest measurable wins land first with the least risk. Item IDs (CB-*, SB-*) reference the audit.

**Guiding rule:** measure before and after each phase (see the audit's Measurement plan). Do not blind-optimize feed ranking. Ship phases 1–2 first — they carry ~80% of the real-world gain.

**DB note:** the user applies migrations manually on prod Supabase. All index statements are `CREATE INDEX CONCURRENTLY` — run each **standalone** (cannot be inside a transaction block). No app deploy is needed for index-only changes.

---

## Phase 1 — Critical bottleneck (the systemic multiplier)

Goal: stop doing 3–5 user lookups per page. This is the single highest-leverage change.

1. **CB-1 part 1 — request-dedupe `auth()`.** Wrap the exported `auth` in React `cache()` (`src/lib/auth.ts`); route `optionalUser`/`requireUser`/`requireAdmin` (`src/modules/auth/session.ts`) through it. Collapses duplicate `auth()` calls within one request to one execution.
   - Risk: none (request-scoped). Test: add a unit/integration assertion that two `optionalUser()` calls in one request trigger one jwt-callback DB hit (spy/count).
2. **CB-11 — `cache()` `getDefaultSchoolId`** (`src/lib/school.ts`). One line; removes a per-page round-trip.
   - Risk: none.

**Verify Phase 1:** Supabase query count per `/feed` render drops from ~5 to ~2; TTFB on gated pages measurably down.

> CB-1 part 2 (gate the jwt DB refresh on `trigger`/TTL) is deferred to Phase 5 — it changes session-freshness semantics and part 1 already removes the intra-request duplication. Do it once part 1 is measured.

---

## Phase 2 — High-impact quick wins (request-path latency)

Independent, low-risk, mostly code-only. Each removes real round-trips or serial waits.

1. **CB-3 — messaging N+1 → one raw unread query** (`src/modules/messaging/service.ts:68-85`). N+1 → 2 queries; also cuts the /messages 10s-poll cost. Add a test asserting unread counts match per-conversation cutoffs.
2. **CB-5 — parallelize `loadProfile`** (`src/app/(main)/[username]/load-profile.tsx:106-214`): `Promise.all` the independent queries; delete the dead `_count: { posts: true }` (:98).
3. **CB-4 — bound `getFollowData`** (`src/modules/connections/service.ts:88-99`): `take: 100` on both `findMany`; separate `follow.count` if a total is needed.
4. **CB-2 — single viewer loader** (`layout.tsx`, `feed/page.tsx`, `ProfileSidebar`, `/api/me`): one `cache()`-wrapped `getViewerCard(id)`; `/api/me` uses token for name, queries only `photoUrl`.

**Verify Phase 2:** query counts on `/messages`, `/[username]`, `/connections` drop; profile TTFB down ~300ms.

---

## Phase 3 — Backend / database optimization (indexes + search)

Pure SQL where possible; run on prod Supabase manually. Cheapest scaling insurance.

1. **CB-6 — trigram indexes for directory search** (prevents `users` seq-scan):
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   CREATE INDEX CONCURRENTLY IF NOT EXISTS users_legal_name_trgm    ON users    USING gin (legal_name   gin_trgm_ops);
   CREATE INDEX CONCURRENTLY IF NOT EXISTS users_display_name_trgm  ON users    USING gin (display_name gin_trgm_ops);
   CREATE INDEX CONCURRENTLY IF NOT EXISTS users_username_trgm      ON users    USING gin (username     gin_trgm_ops);
   CREATE INDEX CONCURRENTLY IF NOT EXISTS profiles_city_trgm       ON profiles USING gin (city        gin_trgm_ops);
   CREATE INDEX CONCURRENTLY IF NOT EXISTS profiles_profession_trgm ON profiles USING gin (profession  gin_trgm_ops);
   ```
2. **SB-3 — leaderboard index:** `CREATE INDEX CONCURRENTLY game_scores_game_played ON game_scores (game_id, played_at);`
3. **SB-2 — feed partial index (measure first via slow log):**
   ```sql
   CREATE INDEX CONCURRENTLY posts_feed_rank
     ON posts (school_id, is_pinned DESC, ranking_score DESC, created_at DESC)
     WHERE deleted_at IS NULL AND status = 'visible';
   ```
4. **SB-1 — feed exclusion `NOT IN(1000)` → `NOT EXISTS` anti-join** — **only if** slow logs show it. Feed ranking is subtle; keep caught-up fallback semantics; add a test.

**Verify Phase 3:** directory search latency flat as user count grows; `EXPLAIN ANALYZE` shows index usage on search + leaderboard.

---

## Phase 4 — Frontend optimization (bundle + re-renders)

Reduce initial JS and wasted renders. Confirm with bundle-analyzer + Lighthouse.

1. **CB-7 — `next/dynamic` the interaction-only components** (`FeedCard` → EmojiPicker, award modal, comments-on-expand; `UpgradeCheckout`; analytics charts). Keep SSR above-the-fold.
2. **CB-9 — `memo(FeedCard)`** and directory card wrapper; verify no inline-literal props defeat it.
3. **CB-10 — `experimental.optimizePackageImports: ["@phosphor-icons/react"]`** in `next.config.ts` (trims admin bundles).
4. **CB-8 — follow-store refactor** (stable dispatch context + per-id selector, or rely on the CB-9 memo) so one follow toggle doesn't re-render the whole list.
5. **SB-5 — delete `MOCK_POSTS`** if dead; **SB-7** — convert content `<img>` in `AchievementsPanel`/`GalleryGrid` to `next/image` (skip upload-preview object URLs); trim unused font weights.

**Verify Phase 4:** feed route JS smaller (analyzer); Lighthouse TBT/LCP on `/feed` improved; React Profiler shows one card re-render on follow toggle, not N.

---

## Phase 5 — Caching & infrastructure

1. **CB-1 part 2 — gate jwt DB refresh** on `trigger === "signIn" | "update"` + optional `iat` TTL (`src/lib/auth.ts`). Removes the per-request user query entirely for steady-state navigation. Test: role/membership change propagates on next sign-in/`update()` within TTL.
2. **SB-8 — CDN-cache reference routes** (`/api/houses`, `/api/schools`, `/api/membership/plans`): `export const revalidate = <n>` or `Cache-Control: s-maxage`.
3. **CB-12 — champions → `revalidate = 3600`** (drop `force-dynamic`).
4. **SB-6 — local initials avatars** replacing `ui-avatars.com` external fetches on dense grids.
5. **SB-10 (optional, architectural) — thin middleware** to short-circuit unauthed requests and let the marketing `/` render static. Design change; only if landing-page TTFB matters.

**Verify Phase 5:** reference routes served from CDN (Vercel cache HIT); no jwt query on steady-state navigation.

---

## Phase 6 — Cleanup & long-term

1. **CB-13 — login path:** `Promise.all` the two rate-limit calls; don't `await audit()` on success (`src/lib/auth.ts`).
2. **CB-14 — drop Sentry `includeLocalVariables` in prod** (`src/sentry.server.config.ts`).
3. **SB-4 — batch cron dedupe checks** in `membership/jobs.ts` when cohorts grow.
4. **SB-9 — `Promise.all`** the profile-page session+user fetch.
5. **Fix stale CLAUDE.md** — it claims `src/middleware.ts` is the sole active gate; there is no middleware in the active tree (gating is per-page via `requireUser`). Update the docs so the next dev doesn't chase a phantom.
6. **Trim unused Poppins/Jakarta font weights** if any are unused.

---

## Ordering rationale

- **Phase 1 first** — the auth multiplier touches every request; fixing it is one small, zero-risk change with the widest blast radius.
- **Phase 2** — the remaining request-path round-trips (messaging N+1, profile serial queries, unbounded follows). Code-only, low risk, immediately felt.
- **Phase 3** — indexes are cheap insurance against growth and don't need an app deploy; do them alongside/after Phase 2.
- **Phase 4** — frontend is a real but smaller lever than the server round-trips; needs bundle-analyzer to justify.
- **Phase 5** — caching + jwt-refresh gating are higher-value but carry semantic change; do after the mechanical wins are measured.
- **Phase 6** — polish, cron scaling, doc hygiene.

**Stop-and-measure gates:** after Phase 1 and after Phase 2, re-run the query-count + TTFB measurements. If those two phases already make the site feel fast, Phases 4–6 become optional polish rather than urgent work.
