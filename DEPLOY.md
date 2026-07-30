# Deploy runbook

Steps needed to ship the **feed revamp + follow-model** work (merged in PR #21).
The application code is on `master`; these steps make it actually run against the
production database and enable media upload.

---

## 1. Connection → Follow migration (REQUIRED before deploy)

The follow-model change replaced the mutual `connections` table with a
one-directional `follows` table. The merged code expects `follows`; production
still has `connections`. Until the migration runs, follow features hit a missing
table and error.

Migration file: `prisma/migrations/20260730130000_follow_model/migration.sql`

**What it does to the data:**

| Action | Effect |
| --- | --- |
| Delete non-accepted rows | Pending / rejected connection requests are **dropped** |
| Rename `connections` → `follows` (+ columns) | Accepted rows carry over |
| Materialize reverse follow | An accepted (mutual) connection becomes **both users following each other** |
| Drop `status`, `auto_accepted`, `contact_exchanged`, `responded_at` | Connection-only columns removed |
| Drop `users.connections_data`, `profiles.connection_auto_accept` | Dead columns removed |

**Net:** accepted friendships → mutual follows (kept). Pending/rejected requests
and the dropped columns → gone. This is a one-way transform.

**Run it:**

```bash
# 1. Snapshot first — this is irreversible (Supabase: take a backup / confirm PITR)
# 2. Apply the pending migration to the production DB
npx prisma migrate deploy
```

> `migrate deploy` applies committed migration files only (no schema drift,
> no prompts) — the correct command for production. Do **not** use
> `migrate dev` against prod.

---

## 2. Backfill ranking scores (recommended, not required)

The feed now sorts by a stored `Post.rankingScore` (recency + engagement).
New and newly-engaged posts fill it automatically; posts that existed before
this change sit at `0` and sort low until re-engaged. This one-off scores them.

```bash
npx tsx scripts/backfill-ranking-scores.ts
```

Safe, idempotent, non-destructive. Run once after the migration.

---

## 3. Media upload env vars (required for images to work)

Media is stored in Cloudflare R2. The endpoint + keys + bucket are already in
`.env`; media upload additionally needs the **public URL prefix** used to build
image links from stored object keys.

Add to production env:

```
R2_BUCKET=<your-bucket-name>            # already present in .env.example
R2_PUBLIC_BASE_URL=<https://…>          # bucket r2.dev URL or custom domain
```

Without `R2_PUBLIC_BASE_URL`, uploads succeed but the stored image URLs won't
resolve. No code change — config only. See `src/lib/r2.ts` (`publicUrlFor`).

---

## Recommended order

```bash
# 0. Back up / snapshot the production database
npx prisma migrate deploy                     # 1 — required
npx tsx scripts/backfill-ranking-scores.ts    # 2 — recommended
# 3 — set R2_BUCKET + R2_PUBLIC_BASE_URL in prod env, then redeploy
```
