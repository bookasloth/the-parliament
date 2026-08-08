# Redis Caching Layer — Design Spec

**Date:** 2026-08-08
**Branch:** `feature/redis-integration`
**Provider:** Upstash Redis (serverless, HTTP-based)
**Client:** `@upstash/redis`

---

## Problem

The Parliament has **~372 Prisma queries** across the codebase. Every page load
fans out 5–15 DB calls: session lookup, feed fetch, notification count, sidebar
data, suggestions, facets. The feed page alone fires 8+ queries. Every navbar
render hits the DB for unread notification count. Directory search runs full
`user.findMany` + `count` + facet aggregations on every keystroke/page.

All reads go directly to the Supabase Postgres pooler over the network. No
caching layer exists. As alumni count grows (target: 2000+ active), page loads
slow down and DB connection pool saturates.

## Goal

Make every page load feel instant (<200ms TTFB) by caching hot reads in Redis.
Reduce Postgres query volume by 60–80% for page-load paths. Zero behaviour
change — cache is transparent, invalidated on writes.

---

## Architecture

```
Browser → Next.js (Vercel Edge/Node) → Redis (Upstash) → Postgres (Supabase)
                                         ↑ cache hit = skip ↓
```

### Core abstraction: `src/lib/redis.ts`

```ts
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Generic cache-aside helper
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const hit = await redis.get<T>(key);
  if (hit !== null) return hit;
  const data = await fetcher();
  await redis.set(key, data, { ex: ttlSeconds });
  return data;
}

// Invalidate by key or prefix
export async function invalidate(...keys: string[]): Promise<void> {
  if (keys.length) await redis.del(...keys);
}

// Invalidate by pattern (use sparingly — SCAN-based)
export async function invalidatePrefix(prefix: string): Promise<void> {
  let cursor = 0;
  do {
    const [next, keys] = await redis.scan(cursor, { match: `${prefix}*`, count: 100 });
    cursor = next;
    if (keys.length) await redis.del(...keys);
  } while (cursor !== 0);
}
```

No wrapper classes, no cache manager, no abstraction layers. One file, three
functions. Every module calls `cached()` directly.

---

## Cache Domains

### 1. Session / Auth (highest impact — every request)

**What:** Hydrated user object (id, username, membership, onboarding, role).
Currently `auth.ts:91` runs `user.findUnique` on every JWT callback.

| Key pattern | TTL | Invalidation |
|---|---|---|
| `session:{userId}` | 5 min | On profile edit, membership change, onboarding step, role change |

**Impact:** Eliminates the single most frequent DB query in the entire app. Every
authenticated page load saves 1 DB round-trip.

**How:** In the `jwt` callback, wrap the user fetch in `cached()`.

---

### 2. Feed (heaviest page — 8+ queries per load)

| Key pattern | TTL | Invalidation |
|---|---|---|
| `feed:{userId}:page:{cursor}` | 2 min | On new post, reaction, or delete by anyone user follows |
| `feed:{userId}:following` | 10 min | On follow/unfollow |
| `feed:{userId}:blocked` | 10 min | On block/unblock |
| `feed:{userId}:hidden` | 10 min | On hide post |
| `feed:{userId}:impressions` | 5 min | On impression record |
| `feed:pinned` | 15 min | On pin/unpin (admin) |
| `feed:suggestions:{userId}` | 30 min | On follow/unfollow |
| `feed:category:{slug}` | 1 hr | On category CRUD (rare) |

**Hot path optimization:** The feed page does `getFeed()` which runs 4–6 queries
internally. Cache the *assembled feed result* (post list + reaction map), not
individual queries. One cache key replaces 6 DB calls.

**Invalidation strategy:** When user A creates a post, invalidate
`feed:{followerId}:page:*` for each follower. Since follower lists are small
(alumni network, not Twitter), this is a bounded fan-out. For reactions/comments
that only update counts, use `feed:post:{postId}:counts` with 30s TTL — let
counts be eventually consistent.

| Key pattern | TTL | Invalidation |
|---|---|---|
| `post:{postId}` | 5 min | On edit, delete, reaction, comment |
| `post:{postId}:comments` | 2 min | On comment create/delete |
| `post:{postId}:reactions:{userId}` | 5 min | On reaction toggle |

---

### 3. Notification unread count (every navbar render)

| Key pattern | TTL | Invalidation |
|---|---|---|
| `notif:unread:{userId}` | none (counter) | `INCR` on create, `DEL` on markAllRead |
| `notif:list:{userId}` | 2 min | On new notification, markRead |

**How:** Replace `notification.count({ where: { read: false } })` with a Redis
counter. `INCR` when `createNotification()` fires, `DEL` when `markAllRead()`.
The navbar reads one Redis key instead of a DB COUNT.

---

### 4. Messaging unread count (navbar + sidebar)

| Key pattern | TTL | Invalidation |
|---|---|---|
| `msg:unread:{userId}` | none (counter) | `INCR` on message received, `DECR` on markRead |
| `msg:conversations:{userId}` | 1 min | On new message, clear chat |

**How:** Same counter pattern as notifications. The `$queryRaw` for total unread
and per-conversation unread becomes a Redis `GET`.

---

### 5. Directory / Search

| Key pattern | TTL | Invalidation |
|---|---|---|
| `dir:search:{hash(query+filters+page)}` | 5 min | On user profile update, new signup |
| `dir:count` | 15 min | On new signup |
| `dir:facets` | 30 min | On profile update (batch/house/division) |

**Hash:** MD5 of `JSON.stringify({ q, batch, house, division, page })`. Short,
deterministic, collision-free for this use case.

**Facets** (batch list, house list, division list) change very rarely — high TTL.

---

### 6. Events

| Key pattern | TTL | Invalidation |
|---|---|---|
| `events:list` | 5 min | On event create/update/cancel |
| `event:{eventId}` | 5 min | On RSVP, update, cancel |
| `event:{eventId}:rsvps` | 2 min | On RSVP/cancel-RSVP |
| `events:interested:{userId}` | 5 min | On RSVP toggle |

---

### 7. Groups

| Key pattern | TTL | Invalidation |
|---|---|---|
| `groups:list` | 10 min | On group create/delete |
| `group:{groupId}` | 5 min | On member join/leave, post |
| `group:{groupId}:members` | 5 min | On join/leave |
| `group:{groupId}:topContrib` | 15 min | On karma change |
| `groups:my:{userId}` | 10 min | On join/leave |

---

### 8. Connections

| Key pattern | TTL | Invalidation |
|---|---|---|
| `conn:following:{userId}` | 10 min | On follow/unfollow |
| `conn:followers:{userId}` | 10 min | On follow/unfollow |
| `conn:suggestions:{userId}` | 30 min | On follow |

---

### 9. Profile pages

| Key pattern | TTL | Invalidation |
|---|---|---|
| `profile:{username}` | 5 min | On profile edit |
| `profile:{username}:posts` | 2 min | On post create/edit/delete |

---

### 10. Karma

| Key pattern | TTL | Invalidation |
|---|---|---|
| `karma:{userId}` | 5 min | On karma transaction |
| `karma:rate:{userId}:{action}:{date}` | 24 hr | Never (auto-expires) |

**Rate limiting via Redis:** Replace DB count queries for karma caps with:
```ts
const key = `karma:rate:${userId}:like:${today}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 86400);
if (count > 30) throw new Error("Daily like limit reached");
```
Atomic, zero DB load, auto-expires at midnight.

---

### 11. Membership

| Key pattern | TTL | Invalidation |
|---|---|---|
| `membership:{userId}` | 10 min | On activate, renew, expire, revoke |

Membership status rarely changes. High TTL, explicit invalidation on state
transitions.

---

### 12. Admin dashboard

| Key pattern | TTL | Invalidation |
|---|---|---|
| `admin:stats` | 5 min | On user/membership/post changes |
| `admin:users:{hash(filters)}` | 2 min | On user action |

Lower priority — admin pages have few concurrent users. But the dashboard runs
4+ aggregate queries, so caching still helps.

---

### 13. Mention search

| Key pattern | TTL | Invalidation |
|---|---|---|
| `mentions:{userId}:{query}` | 5 min | On follow/unfollow |

Three-tier mention search (followers → popular → alphabetical) currently fires
3 DB queries per keystroke. Cache the merged result by query prefix.

---

## Invalidation Strategy

### Write-through invalidation

Every Prisma mutation that changes cached data calls `invalidate()` with the
affected keys. This is explicit, not magic.

**Pattern in every mutation:**
```ts
// In toggleReaction()
await prisma.reaction.create({ ... });
await invalidate(
  `post:${postId}`,
  `feed:${authorId}:page:*`,  // use invalidatePrefix for wildcards
);
```

### Bounded fan-out

When a write affects multiple users' caches (e.g., new post invalidates all
followers' feeds), the fan-out is bounded by the follower count. In an alumni
network of 2000, max followers per user is ~500. Invalidating 500 keys takes
<50ms on Upstash.

### Stale-while-revalidate

For non-critical data (suggestions, facets, top contributors), accept staleness.
TTL handles it — no explicit invalidation needed.

---

## What NOT to cache

- **Write-path data:** Post creation, RSVP, payment flows — these must hit DB.
- **Verification tokens:** Security-sensitive, short-lived, low-volume.
- **Onboarding progress:** Per-user, write-heavy, low-read. Not worth it.
- **Audit logs:** Write-only in normal flow.
- **Admin bulk operations:** Import, export, invite — rare, not read-hot.
- **Email outbox/templates:** Cron-driven, not user-facing.

---

## Implementation Phases

### Phase 1: Foundation + Session + Counters (biggest bang)
1. Install `@upstash/redis`, create `src/lib/redis.ts`
2. Cache session in JWT callback
3. Redis counters for notification unread + messaging unread
4. Karma rate-limit via Redis INCR

**DB reduction:** ~40% of per-request queries eliminated.

### Phase 2: Feed + Posts
1. Cache assembled feed results
2. Cache post detail + comments
3. Write-through invalidation in all feed mutations
4. Cache pinned posts, suggestions

**DB reduction:** Feed page goes from 8+ queries to 1 Redis GET (cache hit).

### Phase 3: Directory + Events + Groups
1. Cache directory search results + facets
2. Cache event list + detail
3. Cache group list + members
4. Cache connections

**DB reduction:** Directory search from 4 queries to 1. Event/group pages similar.

### Phase 4: Profile + Membership + Mentions
1. Cache profile pages
2. Cache membership status
3. Cache mention search results

**DB reduction:** Profile pages from 3 queries to 1.

---

## Environment Variables Needed

```env
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxx
```

Add to:
- `.env` (local dev)
- Vercel Environment Variables (production + preview)

---

## What You Need Ready

1. **Upstash account** — sign up at [console.upstash.com](https://console.upstash.com), create a Redis database (free tier: 10K commands/day, 256MB)
2. **Two env vars** — copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from the Upstash dashboard
3. **Add to Vercel** — paste both vars in Vercel project settings → Environment Variables (all environments)
4. **Add to `.env`** — same vars for local dev (Upstash works from localhost, no Docker needed)

That's it. No Docker Redis, no persistent connections, no infrastructure.

---

## Cost Estimate

Upstash free tier: **10,000 commands/day**, 256MB storage.

With ~50 active daily users × ~20 page loads × ~3 cache operations = ~3,000
commands/day. Well within free tier.

At 500 daily active users: ~30,000 commands/day → **Pay-as-you-go: ~$0.20/day**
($6/month). Upstash charges $0.2 per 100K commands.

---

## Monitoring

Upstash dashboard shows:
- Commands/day, hit rate, memory usage
- Slow commands, errors

Add a `cache:hit` / `cache:miss` counter in the `cached()` helper for
observability (log to console in dev, silent in prod).

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Cache gets stale | Short TTLs (2–5 min) + explicit invalidation on writes |
| Upstash goes down | `cached()` catches errors, falls through to DB. App works without Redis, just slower |
| Free tier exceeded | Upstash doesn't cut off — charges overage at $0.2/100K. Monitor via dashboard |
| Cache stampede | Not a real risk at alumni-network scale (<2000 users). If needed, add mutex in `cached()` later |
| Key bloat | All keys have TTL. No unbounded growth. |
