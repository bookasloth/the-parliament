# Performance Audit — The Parliament (NNAWCA)

**Date:** 2026-08-06 · **Branch:** `perf-audit` · **Method:** static read-only audit of the full codebase (513 TS/TSX files, 79 pages, 54 API routes, `prisma/schema.prisma` ~60 models) plus `next.config.ts`, auth/session, `public/`. No production build or live profiling was run — bundle figures are inferred from the import graph, DB costs from query-count × pooler round-trip latency.

---

## TL;DR

The site is **not** slow because of one broken thing. It is slow because of **one systemic multiplier plus a handful of unbounded/serial queries**, layered on a rendering strategy where **almost nothing is cached** (41 `force-dynamic` files).

The codebase is, honestly, already performance-conscious in most respects — denormalized post counters, DB triggers for vote/comment counts, disciplined `Promise.all` batching, `take` limits on nearly every list query, two `unstable_cache` layers, heavy libs isolated per-route, `loading.tsx` coverage, tiny assets (101 KB total `public/`), self-hosted `next/font`, tree-shakeable named icon imports. Several worries in the brief (framer-motion in the main bundle, huge images, duplicate icon libs) are **confirmed non-issues** and listed at the bottom so nobody re-audits them.

**The single biggest win:** the Auth.js `jwt` callback runs a `prisma.user.findUnique` on **every** `auth()` call, and `auth()` is not request-deduped — so every gated page does **3–5 near-identical user lookups** before its own data loads, and every authed API call adds one more. Three of the four audit passes independently flagged this as the top issue.

**Nothing here is Critical-as-in-outage.** The Critical tag below is reserved for the systemic latency multiplier that touches every request.

---

## Confirmed bottlenecks

### CB-1 — `jwt` callback hits the DB on every `auth()` call; no per-request dedupe · **CRITICAL**
- **Where:** `src/lib/auth.ts:69-105` (jwt callback `prisma.user.findUnique` + `userRoles` join); `src/modules/auth/session.ts:18-38` (`requireUser`/`optionalUser`/`requireAdmin` each call bare `await auth()`). No `cache()` anywhere in either file (confirmed by grep).
- **Evidence:** JWT strategy is supposed to be a stateless, DB-free session read. Auth.js v5 runs the `jwt` callback on **every** session read, and `auth()` is not wrapped in React `cache()`, so calls within one request do not collapse. Worked example — one `/feed` navigation:

  | # | Source | Query |
  |---|--------|-------|
  | 1 | `(main)/layout.tsx:11` `optionalUser()` | jwt callback `user.findUnique` |
  | 2 | `(main)/layout.tsx:14` navbar viewer | `user.findUnique` (overlapping cols) |
  | 3 | `feed/page.tsx:21` `optionalUser()` | jwt callback `user.findUnique` |
  | 4 | `feed/page.tsx:40` viewer card | `user.findUnique` (superset of #2) |
  | (+) | `ProfileSidebar.tsx:10-12` on pages that use it | +2 more |

  37 of 54 API routes call an auth guard, so every client XHR (`/api/me`, `/api/notifications/summary`, …) adds another jwt query on top of its own work.
- **Impact:** 3–5 Supabase round-trips (pgBouncer pooler, ~5–30ms each) for one user's row, on **every** gated page render and **every** authed API call. Largest avoidable per-request server cost.
- **Fix (two parts):**
  1. `export const auth = cache(baseAuth)` (React `cache` from `"react"`) — collapses duplicate `auth()` calls to one execution per request. Route `optionalUser`/`requireUser`/`requireAdmin` through it.
  2. Gate the DB refresh in the jwt callback on `trigger === "signIn" | "update"` (add `trigger` to callback args) instead of running unconditionally. The token already carries `username`, `displayName`, `membershipStatus`, `roles`. Optionally add a TTL (refresh if `token.iat` older than N min).
- **Risk:** Part 1: none — `cache()` is request-scoped, correctness unchanged. Part 2: role/membership changes take up to the TTL to reach an active session — acceptable (sessions are already 30-day). Keep the existing try/catch that preserves the token on a DB blip.

---

### CB-2 — Layout + page + `/api/me` each re-fetch the same viewer row · **HIGH**
- **Where:** `src/app/(main)/layout.tsx:14`, `src/app/(main)/feed/page.tsx:40`, `src/components/shared/ProfileSidebar.tsx:10-12`, `src/app/api/me/route.ts:9`.
- **Evidence:** The `(main)` layout fetches the viewer (name/username/membership/photo/batch) for the navbar; the feed page immediately re-fetches the same user (superset of columns) for the viewer card; `ProfileSidebar` does it again; `/api/me` fetches name+photo a fourth time — and the name fields are already in the JWT. 7 API routes do an extra `user.findUnique` on top of `requireUser`.
- **Impact:** 2–3 duplicate round-trips per page for data already in hand.
- **Fix:** Extract one `cache()`-wrapped `getViewerCard(id)` used by layout, feed viewer block, and `getSidebarViewer`. Have the layout pass the viewer down, or expose it via the request-cached loader. For `/api/me`, drop the name query (use the token) and fetch only `profile.photoUrl` — or put `photoUrl` in the token too.
- **Risk:** Low, mechanical.

---

### CB-3 — Messaging sidebar N+1: one `message.count()` per conversation · **HIGH**
- **Where:** `src/modules/messaging/service.ts:68-85` (`listConversations`, inside `Promise.all(rows.map(async …))`).
- **Evidence:** One `prisma.message.count()` per conversation to compute unread badges. N conversations = **1 + N** round-trips. Re-runs on the `/messages` 10s poll cycle. 15 conversations ≈ 0.5–1.2s of pure latency, repeatedly.
- **Impact:** High — request path, repeats on every poll, scales with conversation count.
- **Fix:** One raw query for all conversations (per-row `lastReadAt` cutoff can't be expressed by `groupBy`):
  ```sql
  SELECT m.conversation_id, count(*)::int AS unread
  FROM messages m
  JOIN conversation_participants cp
    ON cp.conversation_id = m.conversation_id AND cp.user_id = $viewerId
  WHERE m.conversation_id = ANY($convIds)
    AND m.deleted_at IS NULL
    AND m.sender_id <> $viewerId
    AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
  GROUP BY m.conversation_id;
  ```
  Map counts back in JS. N+1 → 2 queries. Index `messages(conversation_id, created_at)` already exists.
- **Risk:** Low. Pure read, same semantics.

---

### CB-4 — `getFollowData` loads ALL follows with full profile joins, no `take` · **HIGH**
- **Where:** `src/modules/connections/service.ts:88-99` (used by `/connections`).
- **Evidence:** Both `follow.findMany` (following + followers) have `orderBy` but **no `take`**, each `include`-ing the full `userSelect` (profile/house/batch joins). Contrast the bounded queries right below (`take: 6` at :113) and `network/page.tsx:49` (`take: 48`). For a hub user with hundreds of follows this materializes every row with joins and ships the full lists to the client.
- **Impact:** Unbounded query + payload that grows with the social graph — fine at seed scale, a cliff as the network grows.
- **Fix:** `take: 100` (or paginate) on both; lazy-load the rest client-side like `/network` already does. If the UI needs a total, use a separate `follow.count`.
- **Risk:** Low — "shows first N" matches every other list page.

---

### CB-5 — `loadProfile` runs ~6 sequential independent queries · **HIGH**
- **Where:** `src/app/(main)/[username]/load-profile.tsx:106-214`.
- **Evidence:** After the initial `user` fetch, these run **sequentially** though all depend only on `user.id`: `experience.findMany` (106), `education.findMany` (123), `getFeed` (137, itself multiple queries), followers+`getFollowingIds` `Promise.all` (152), `post.count` (193), `follow.findUnique` viewerFollows (207), `getCurrent` (214, own profile). ~6 serial hops @ ~50ms ≈ 300ms avoidable serial latency on a top-traffic page. Also: `_count: { posts: true }` selected at :98 is computed then **discarded** — overridden by the explicit visible-only `post.count` at :193.
- **Impact:** ~300ms serial latency on the profile page + one wasted aggregate.
- **Fix:** Wrap the independent queries in one `Promise.all` after the user row is known. Drop the dead `_count.posts` from the select.
- **Risk:** Low, mechanical.

---

### CB-6 — Directory search uses unindexed `ILIKE '%q%'` · **MEDIUM** (→ High as users grow)
- **Where:** `src/modules/directory/service.ts:54-66` (name/username), `:65-66` (city/profession); paired `user.count` at `:112`.
- **Evidence:** Prisma `contains` + `mode: "insensitive"` compiles to `ILIKE '%q%'`, which **cannot use a btree index** — sequential scan of `users` on every search keystroke, then the count scans it again. Fine at hundreds of users, a full-table seq-scan at thousands.
- **Impact:** Search latency grows linearly with user count; doubles via the count query.
- **Fix (pure SQL, no code change) — trigram GIN indexes:**
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX CONCURRENTLY IF NOT EXISTS users_legal_name_trgm     ON users    USING gin (legal_name   gin_trgm_ops);
  CREATE INDEX CONCURRENTLY IF NOT EXISTS users_display_name_trgm   ON users    USING gin (display_name gin_trgm_ops);
  CREATE INDEX CONCURRENTLY IF NOT EXISTS users_username_trgm       ON users    USING gin (username     gin_trgm_ops);
  CREATE INDEX CONCURRENTLY IF NOT EXISTS profiles_city_trgm        ON profiles USING gin (city        gin_trgm_ops);
  CREATE INDEX CONCURRENTLY IF NOT EXISTS profiles_profession_trgm  ON profiles USING gin (profession  gin_trgm_ops);
  ```
- **Risk:** Low. GIN adds write overhead (infrequent user/profile edits) + disk. `CONCURRENTLY` avoids locking; it **cannot** run inside a transaction block — run each statement standalone.

---

### CB-7 — No `next/dynamic` code-splitting; interaction-only components eagerly bundled · **MEDIUM** (High for the feed route)
- **Where:** `src/components/shared/FeedCard.tsx:18,23,24` static-imports `EmojiPicker`, `ReactionBar`, `CommentsSection`. Grep for `next/dynamic` across all `.tsx` → **zero matches**.
- **Evidence:** EmojiPicker (award/emoji modal) and CommentsSection render only on interaction, yet ship in the initial feed JS. Same for `UpgradeCheckout` (Razorpay) and analytics charts.
- **Impact:** Larger initial feed JS + hydration cost; most sessions never open the emoji/award modal.
- **Fix:** `const EmojiPicker = dynamic(() => import("@/components/shared/EmojiPicker"), { ssr: false })`; same for the award modal and comments-on-expand. Keep SSR for above-the-fold content.
- **Risk:** Low — keep a loading fallback; don't `ssr:false` anything above-the-fold/SEO-relevant.

---

### CB-8 — App-wide follow Context re-renders every card on any toggle · **MEDIUM**
- **Where:** `src/components/shared/follow-store.tsx:12-22` wired at `src/app/(main)/layout.tsx:46`.
- **Evidence:** `FollowStoreProvider` wraps the whole `(main)` tree. `set` builds a **new `Map`** on every toggle (`:17-19`); every `useFollow` consumer subscribes to the context value, so following one person re-renders **all** `FeedCard`/`AlumniProfileCard`/`FollowButton` instances at once.
- **Impact:** Jank-on-interaction on long feed/directory grids (not steady-state — follows are infrequent).
- **Fix:** Cheapest — `React.memo` the cards (each reads its own follow via `useFollow`). Better — split into a stable dispatch context + per-id selector.
- **Risk:** Low.

---

### CB-9 — `FeedCard` / list items not memoized · **MEDIUM**
- **Where:** `src/components/shared/FeedCard.tsx:1` (bare export), mapped in `src/app/(main)/feed/feed-content.tsx`.
- **Evidence:** `feed-content` holds feed state (30s new-post poll, load-more, impression batching). Every state tick re-renders every mounted `FeedCard` + its `ReactionBar`/`RichText` subtree because the card isn't `memo()`-wrapped.
- **Impact:** Re-render cost scales with visible post count on every poll tick.
- **Fix:** `export const FeedCard = memo(function FeedCard(...) {...})`. Verify props from `feed-content` aren't fresh inline objects/arrays (server actions are module-level — good).
- **Risk:** Low; verify no inline-literal prop defeats the memo.

---

### CB-10 — `@phosphor-icons/react` not in `optimizePackageImports` · **MEDIUM** (admin-only)
- **Where:** `next.config.ts:59-73` (no `experimental` block).
- **Evidence:** Icons are all tree-shakeable named imports (no `import * as`). Next 16 auto-optimizes `lucide-react` (member app) but **not** `@phosphor-icons/react`, which is imported in 20 `src/app/admin/**` files. So admin bundles carry more phosphor barrel code than the ~15 glyphs used. Contained to admin route group.
- **Impact:** Heavier admin-console JS; ~zero effect on member pages.
- **Fix:** `experimental: { optimizePackageImports: ["@phosphor-icons/react"] }` in `next.config.ts`.
- **Risk:** None — build-time tree-shaking hint.

---

### CB-11 — `getDefaultSchoolId` uncached, one round-trip per gated page · **LOW**
- **Where:** `src/lib/school.ts:7-10` (`prisma.school.findFirst`, comment explicitly declines to cache).
- **Evidence:** Called on nearly every gated page (feed, events, community, network). Constant in a single-school deployment.
- **Impact:** One guaranteed extra round-trip per page for a value that never changes.
- **Fix:** Wrap in React `cache()` (per-request dedupe) or `unstable_cache` with long `revalidate`. One line.
- **Risk:** None.

---

### CB-12 — `champions` page `force-dynamic` on fully-public data · **LOW**
- **Where:** `src/app/(main)/games/alfazy/champions/page.tsx:9`.
- **Evidence:** No session, no per-viewer data — just `gameChampion.findMany` (public hall-of-fame, changes only on period close). `force-dynamic` re-queries every hit.
- **Fix:** Replace with `export const revalidate = 3600` (ISR). `searchParams` filters still work.
- **Risk:** Low — up to 1h stale on a hall-of-fame page.

---

### CB-13 — Login path: minor sequential DB writes · **LOW**
- **Where:** `src/lib/auth.ts:44-63` → `rate-limit.ts:24`, `audit.ts:15`.
- **Evidence:** `authorize()` runs 2× `rateLimitCounter.upsert` (IP + email) → `user.findUnique` → `bcrypt.compare` (~250ms, deliberate) → `auditLog.create`, all sequential. Login-only, not a hot path; writes are security-correct — keep them.
- **Fix:** Run the two `enforceRateLimit` calls in `Promise.all`; don't `await` `audit()` on the success path (it already swallows errors).
- **Risk:** Low.

---

### CB-14 — Sentry `includeLocalVariables: true` on server runtime · **LOW**
- **Where:** `src/sentry.server.config.ts:8`.
- **Evidence:** Attaches local-variable snapshots to server stack frames — extra capture overhead + larger error payloads, and can surface sensitive values. `tracesSampleRate` is a sane 0.1 prod; Session Replay correctly deferred.
- **Fix:** Drop `includeLocalVariables` in prod.
- **Risk:** Low — slightly less debug detail on errors.

---

## Suspected / possible bottlenecks (measure before acting)

| ID | Where | Suspicion | Severity | Action |
|----|-------|-----------|----------|--------|
| SB-1 | `src/modules/feed/query.ts:97,130` + `impressions.ts:10` | Feed exclusion builds `id NOT IN (…up to 1000 UUIDs…)` on the hottest query — big bind list, defeats index-only scans. Already bounded (good). | Medium | Replace with `NOT EXISTS` anti-join against `post_impressions`, or lower window to ~300. **Measure in slow logs first** — feed ranking is subtle. |
| SB-2 | `query.ts:116` vs `schema.prisma:580` | Feed main query filters `schoolId+status='visible'+deletedAt IS NULL`, orders `isPinned,rankingScore,createdAt`; existing `@@index([schoolId, rankingScore])` is a partial match. | Low-Med | Partial index: `CREATE INDEX CONCURRENTLY posts_feed_rank ON posts (school_id, is_pinned DESC, ranking_score DESC, created_at DESC) WHERE deleted_at IS NULL AND status='visible';` |
| SB-3 | `src/modules/games/leaderboard.ts:138-163` | `fetchWindowScores` filters `(gameId, playedAt range)` but no `(game_id, played_at)` index exists; `period="all"` unbounded scan. Cached 60s, low traffic. | Low | `CREATE INDEX CONCURRENTLY game_scores_game_played ON game_scores (game_id, played_at);` |
| SB-4 | `src/modules/membership/jobs.ts:109-241` | Cron handlers do per-row `membershipEvent.findFirst` dedupe + `create` in `for` loops. Background, not request path. | Low | Batch the "already sent" check with one `findMany … where userId in […]` before the loop when cohorts grow. |
| SB-5 | `src/app/(main)/feed/feed-content.tsx:51+` | Embedded `MOCK_POSTS` may be dead once feed is fully wired — shipped-but-unused client JS. | Low | Verify + delete. |
| SB-6 | `(main)/layout.tsx:39` + feed/connections data mappers | `ui-avatars.com` fallback = one external image fetch per photoless user, proxied through Next image opt. Dense grids = N external calls. | Low-Med | Replace with local/CSS/inline-SVG initials avatar. |
| SB-7 | `AchievementsPanel.tsx`, `GalleryGrid.tsx` (raw `<img>`) | Content images as raw `<img>` (13 across 10 files) — most are legit upload previews (object URLs), but content images could use `next/image` to avoid CLS. | Low | Audit case-by-case; convert content images only. |
| SB-8 | `src/app/api/houses`, `/schools`, `/membership/plans` | Reference/read-mostly routes are dynamic with no `Cache-Control`/`revalidate` — hit a cold function every time. | Medium | Add `export const revalidate = <n>` or `Cache-Control: s-maxage` so Vercel CDN serves them. |
| SB-9 | `src/app/(main)/[username]/profile/page.tsx:27-29` | `await optionalUser()` then `await user.findUnique` run sequentially though independent. | Low | `Promise.all`. |
| SB-10 | Root `/` (`page.tsx:5`), ~30 other `force-dynamic` pages | Redundant `force-dynamic` — pages are *already* dynamic via `optionalUser()`/`searchParams`, so the directive changes nothing. Making `/` truly static needs the logged-in redirect moved to middleware. | Informational | Don't sweep for perf; only matters where a page is *actually* static (CB-12). |

---

## Confirmed non-issues (do NOT re-audit these)

- **framer-motion is not in the always-mounted path.** No `framer-motion`/`motion.` in `FeedCard`, `PrivateNavbar`, `AlumniProfileCard`, `reaction-bar`, or `(main)/layout`. It lives in homepage/marketing + a few per-route client pages — correctly kept out of the member main bundle.
- **`AlumniProfileCard` is a Server Component** — directory/connection grids render server-side, zero client JS for the card shell.
- **Two icon libraries are route-segregated, not redundant** — lucide = member app, phosphor = admin only (intentional per CLAUDE.md). No dedup win.
- **Icons are all tree-shakeable named imports** — no barrel/default/`import * as`.
- **Fonts via `next/font/google`** — self-hosted, no render-blocking Google Fonts `<link>`. (Minor nit: Poppins loads 4 weights + Jakarta 2; drop any unused.)
- **`public/` is 101 KB total** (largest file 40 KB) — the "large unoptimized assets" worry is unfounded.
- **Cold-start bundle bloat is not a problem** — `razorpay`, `@aws-sdk/client-s3`, `nodemailer`, `pg-boss` are cleanly isolated to their routes; none leak into feed/notifications/me read paths. `instrumentation.ts` lazy-`import()`s Sentry config.
- **Connection pool `max: 5`** is correct and deliberate for Vercel + pgBouncer — do **not** raise it (risks exhausting Postgres `max_connections`). The lever is cutting queries per request, not enlarging the pool.
- **Polymorphic relations (Reaction/ContentReport)** are batch-fetched in one `findMany({ where: { entityId: { in: [...] } } })`, backed by unique + `(entity_type, entity_id)` indexes. No per-item queries.
- **Client polling is healthy** — notifications 60s, feed new-post 30s, messages list 10s, `ConversationView` uses Supabase Realtime (not a poll). No `useEffect`+`fetch` waterfalls of concern; homepage `setInterval`s are pure animation, no network.
- **`unstable_cache` used well** — directory (`community/page.tsx`) and events lists, tag-invalidated, overlaying per-viewer state live.
- **No `Math.random`/`new Date()` hydration hazards** — all guarded or index-derived.
- **`_count`/reaction batching, `Promise.all`, `take` limits** used consistently outside the specific sites flagged above.

---

## Quick wins vs architectural

**Quick wins (hours, low risk, measurable):**
- CB-1 part 1 (`cache(auth)`), CB-11 (`cache(getDefaultSchoolId)`), CB-5 (parallelize `loadProfile` + drop dead `_count`), CB-3 (messaging N+1 → raw query), CB-6 (trigram indexes — SQL only), CB-4 (`take` on follows), CB-10 (`optimizePackageImports`), CB-12 (champions ISR), CB-9 (`memo(FeedCard)`), CB-7 (`dynamic()` EmojiPicker), SB-8 (CDN reference routes), SB-5 (delete MOCK_POSTS).

**Architectural (design change, measure first):**
- CB-1 part 2 (gate jwt refresh on trigger + TTL — session-freshness semantics), CB-8 (follow-store selector refactor), CB-2 (viewer-loader plumbed through layout), SB-1 (feed exclusion anti-join), SB-6 (local initials avatars), SB-10 (middleware gate to make marketing `/` static).

---

## Measurement plan (do this before and after)

The audit is static. Confirm the wins with numbers:
1. **`next build` + `@next/bundle-analyzer`** — verify CB-7/CB-10 bundle deltas (feed route, admin route).
2. **Supabase slow-query log / `pg_stat_statements`** — confirm CB-1/CB-2/CB-3/CB-5 query counts drop, and check whether SB-1/SB-2 actually show up before touching feed ranking.
3. **Vercel Analytics / server timing** — TTFB on `/feed`, `/[username]`, `/messages` before vs after CB-1.
4. **Lighthouse** on `/feed` — LCP/TBT before vs after CB-7/CB-9.

Do not optimize SB-1/SB-2 (feed ranking) blind — measure first; the ranking logic is subtle and the current query is already indexed and bounded.
