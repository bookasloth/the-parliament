# Alfazy — Daily Word Game + Competitive Leaderboards

**Status:** BUILT (2026-08-06) — pending DB migration + seed on target
**Date:** 2026-08-05
**Owner:** solo
**Module:** `src/modules/games/` (schema backbone already exists), route group `(main)/games/`

---

## 1. Product summary

Alfazy = a daily Wordle-style word game for the alumni network. One shared puzzle
per day (everyone gets the same word), played solo (async — no realtime). Each play
earns a **score**. Scores roll up into **three competitive leaderboards** — Individual,
House, Batch — sliced across **five time periods** — Daily, Weekly (Mon–Sun), Monthly,
Yearly, All-time. Period winners are frozen as **Champions**, which unlock **trophies**
shown in a **trophy case** on the member's profile.

**Launch date: 1 July 2026.** Seed real historical play from 1 July → today so
leaderboards, champions, and trophy cases have genuine data on day one.

### Non-goals (this build)
- No realtime multiplayer / duels (async only).
- No other games (Tic Tac Toe, Sudoku, etc.) — Alfazy only. Structure is a template.
- No time-bound scoring — **guesses only, no timer**.
- Location league — dropped.
- Karma integration — **games never award karma** (`GAME_KARMA_HARD_CAP: 0` stays).
  Score/leaderboards are a separate game-only currency.

---

## 2. Gameplay

- 6 guesses × 5-letter word. Standard Wordle feedback: correct (green) / present
  (yellow) / absent (grey).
- One puzzle per calendar day, same word for everyone. **One play per user per day**
  (enforced by unique constraint — no farming).
- Server owns the answer. Client submits guesses; **server validates** each guess and
  computes the score. Client score is never trusted.

### Daily puzzle — deterministic, DB dictionary
Words live in a DB table `AlfazyWord { idx, word }` (seeded via SQL, §10).
`puzzleNo = daysSince(2026-07-01)` (launch). `word = SELECT word WHERE idx = puzzleNo % count`.
Deterministic given the stable `idx` ordering — no `Math.random`, no hydration mismatch.
`pickIndex(puzzleNo, count)` is pure (testable); the DB read is a thin wrapper.

| Date | Days since launch | Puzzle # | Word (illustrative) |
|------|-------------------|----------|---------------------|
| 2026-07-01 | 0 | #001 | CRANE |
| 2026-07-02 | 1 | #002 | SLOTH |
| 2026-08-05 | 35 | #036 | HOUSE |

### Scoring — guesses only
```
solved:  score = 100 + (6 - guessesUsed) * 20     // 1 guess→200 … 6 guesses→100
failed:  score = 20                                // participation
```
`bestGuesses` per user = min guesses ever used to solve (the "Best" column, e.g. `3/6`).

---

## 3. Leaderboard engine — one query, 15 views

Every leaderboard = **`SUM(score)` over a date window, grouped by scope, ordered desc.**

```
leaderboard(scope, period, anchor):
  window = windowFor(period, anchor)              // {start, end}
  SELECT SUM(score) AS total, <scopeKey>
  FROM game_scores gs JOIN profiles p ON p.user_id = gs.user_id
  WHERE gs.game_id = <alfazy> AND gs.played_at IN [window.start, window.end]
  GROUP BY <scopeKey>                             // user_id | house_id | batch_id
  ORDER BY total DESC
```

- **scope** ∈ `individual` | `house` | `batch`
  (individual → group by user; house → sum member scores; batch → sum member scores)
- **period** ∈ `daily` | `weekly` | `monthly` | `yearly` | `all`
- **anchor** = a date/label to place the window in history (see §5). Defaults to "now".

**House & Batch use SUM of member scores** (per decision — favours larger cohorts;
switchable to average later in one line).

### Period windows (Mon–Sun weeks)
| Period | Window rule |
|--------|-------------|
| daily | calendar day of anchor |
| weekly | Monday 00:00 → Sunday 23:59 containing anchor. `weekStart = d - ((d.getDay()+6)%7)` |
| monthly | calendar month of anchor |
| yearly | calendar year of anchor |
| all | since launch (2026-07-01) |

---

## 4. Worked example (verifies the math = test spec)

Puzzle #036 (2026-08-05 = Wed) — six players, same word HOUSE:

| User | House | Batch | Solved | Guesses | Score |
|------|-------|-------|--------|---------|-------|
| Shubham | Udaigiri | 2006–13 | ✅ | 3 | 160 |
| Durga | Laxmi | 2012–19 | ✅ | 2 | 180 |
| Pranav | Shiwalik | 2006–13 | ✅ | 4 | 140 |
| Rohan | Aravali | 2008 | ✅ | 3 | 160 |
| Priya | Udaigiri | 2013–19 | ✅ | 5 | 120 |
| Karan | Laxmi | 2010 | ❌ | 6 | 20 |

Weekly window = Mon 2026-08-03 → Sun 2026-08-09. Suppose 3 days played:

| User | House | Aug3 | Aug4 | Aug5 | Week sum |
|------|-------|------|------|------|----------|
| Shubham | Udaigiri | 160 | 180 | 160 | 500 |
| Durga | Laxmi | 200 | — | 180 | 380 |
| Priya | Udaigiri | 120 | 140 | 120 | 380 |
| Karan | Laxmi | 20 | 160 | 20 | 200 |

- **Individual · Weekly:** Shubham 500 🥇, Durga 380 🥈(tie), Priya 380, Karan 200.
- **House · Weekly:** Udaigiri 880 🥇, Laxmi 580 🥈.
- **Individual · Daily(Aug5):** Durga 180 🥇, Shubham 160, Priya 120, Karan 20.

Same rows, different `WHERE` window → different champion. Tie broken by fewer total
guesses, then earliest last-play.

---

## 5. Champions — frozen record

Live recompute (§3 with an anchor) answers *any* past window on demand. But a champion
is a **historical fact** — freeze it so it survives score edits, member deletion, or a
formula change.

```prisma
model GameChampion {
  gameId      String   @map("game_id") @db.Uuid
  scope       String   @db.VarChar(12)   // individual | house | batch
  period      String   @db.VarChar(12)   // daily | weekly | monthly | yearly
  anchor      String   @db.VarChar(16)   // "2026-08-05" | "2026-W32" | "2026-08" | "2026"
  winnerKey   String   @map("winner_key") @db.Uuid       // userId | houseId | batchId
  winnerLabel String   @map("winner_label") @db.VarChar(120) // denormalized, survives deletion
  totalScore  Int      @map("total_score")
  decidedAt   DateTime @default(now()) @map("decided_at") @db.Timestamptz

  game Game @relation(fields: [gameId], references: [id], onDelete: Cascade)
  @@id([gameId, scope, period, anchor, winnerKey])  // co-champions: ties share rank 1
  @@index([scope, period])
  @@index([winnerKey])
  @@map("game_champions")
}
```

**Anchor format** so "week 23 batchwise champion" is directly addressable:
`2026-W23` (ISO week), `2026-08` (month), `2026` (year), `2026-08-05` (day).

### Cron close schedule (daily granularity — Vercel Hobby limit, run via GitHub Actions)
| Period | Runs | Freezes |
|--------|------|---------|
| daily | 00:05 daily | yesterday |
| weekly | Mon 00:05 | last Mon–Sun |
| monthly | 1st 00:10 | last month |
| yearly | Jan 1 00:15 | last year |

One `POST /api/cron/alfazy-champions` handler resolves which periods just closed for
the run date and upserts rank-1 rows for all 3 scopes. Idempotent (PK upsert).

---

## 6. Trophy case — derived, no per-user award job

A member's trophies = **every `GameChampion` row matching their identity**:
```
trophies(user) = GameChampion WHERE
    (scope=individual AND winnerKey = user.id)
 OR (scope=house      AND winnerKey = user.profile.houseId)
 OR (scope=batch      AND winnerKey = user.profile.batchId)
```
House/batch wins → every current member matches → all inherit the trophy. Individual
win → only that user. Zero extra tables, zero fan-out — pure read.

**Membership is live** (current house/batch). JNV house is school-assigned and rarely
changes, so acceptable; frozen-roster is a later option if needed.

### Trophy config (lucide icons, member app convention — NO emoji)
`src/config/alfazy-trophies.ts` maps `(scope:period) → {label, Icon, tone}`:

| scope:period | Label | lucide Icon | tone |
|--------------|-------|-------------|------|
| individual:daily | Daily Champion | Medal | brand |
| individual:weekly | Weekly Champion | Trophy | gold |
| individual:monthly | Monthly Champion | Crown | gold |
| individual:yearly | Alfazy Legend | Crown | gold |
| house:weekly | House Weekly Winner | Shield | house |
| house:monthly | House of the Month | ShieldCheck | house |
| batch:weekly | Batch Weekly Winner | Users | brand |
| batch:monthly | Batch of the Month | Award | brand |
| batch:yearly | Batch Legends | Award | gold |

---

## 7. URL structure

| URL | Page |
|-----|------|
| `/games` | Games landing (grid) |
| `/games/alfazy` | Hub — Play card, Your Stats, Today's board |
| `/games/alfazy/play` | Board (6×5 + on-screen keyboard) |
| `/games/alfazy/leaderboard` | Podium + table + champions rail |
| `/games/alfazy/champions` | Hall of Champions (past winners) |

Scope/period/anchor = **query params** (15 views, zero extra route files):
- `/games/alfazy/leaderboard?scope=house&period=weekly`
- `/games/alfazy/leaderboard?scope=batch&period=weekly&anchor=2026-W23` ← week-23 batch champ
- `/games/alfazy/champions?scope=batch` (filter the history column)

Trophy case lives on the **profile right sidebar** (`components/shared/TrophyCase.tsx`),
"View All" → `/games/alfazy/champions?winner=<userId>`.

---

## 8. Data model changes

| Table | Change |
|-------|--------|
| `games` | seed 1 row: `{ key:"alfazy", title:"Alfazy", genre:"word", mode:"single" }` |
| `game_scores` | **+ unique `[gameId, userId, puzzleDate]`** (one play/day). Store guesses used in existing `levelReached`. `score`, `playedAt` already present. No time field. |
| `game_champions` | **NEW** (see §5) |
| — | No `game_ratings` table (leaderboards are windowed sums, Elo dropped) |

`puzzleDate` needs to be a column on `game_scores` for the unique constraint — add
`puzzleDate Date @map("puzzle_date")`.

---

## 9. File plan

```
src/config/
  alfazy-words.ts          # curated 5-letter word list + getDailyPuzzle(date)
  alfazy-trophies.ts       # (scope:period) → {label, Icon, tone}
src/modules/games/
  periods.ts               # windowFor(period, anchor), anchorFor(period, date), ISO week
  alfazy.ts                # getDailyPuzzle, checkGuess (green/yellow/grey), scorePlay
  leaderboard.ts           # leaderboard(scope, period, anchor) — the one query
  champions.ts             # closePeriods(date) → upsert GameChampion; trophiesForUser(userId)
  actions.ts               # "use server" submitResult(guesses) — validates, writes score
src/app/(main)/games/
  layout.tsx               # sidebar (game list) + child
  page.tsx                 # games grid
  alfazy/page.tsx          # hub
  alfazy/play/page.tsx     # board (client) + AlfazyBoard component
  alfazy/leaderboard/page.tsx
  alfazy/champions/page.tsx
src/components/games/
  AlfazyBoard.tsx, Keyboard.tsx, Podium.tsx, LeaderboardTable.tsx, ChampionsRail.tsx
src/components/shared/
  TrophyCase.tsx           # mounted in profile right sidebar
src/app/api/cron/alfazy-champions/route.ts
scripts/seed-alfazy.ts     # real history 1 Jul → today (or fold into scripts/seed.ts)
tests/
  alfazy-periods.test.ts, alfazy-scoring.test.ts, alfazy-leaderboard.test.ts,
  alfazy-champions.test.ts, alfazy-trophies.test.ts
```

---

## 10. Seed — real historical data (1 July → today)

Deterministic, DB-free-of-randomness where it matters (fixed seed for reproducibility):
- ~30–40 alumni across the 4 ANSU houses + a few pre-2002, spread over ~6 batches.
- For each day #001..#036, a realistic subset (60–85%) of players "played", each with a
  plausible guesses-used distribution (most solve in 3–4, some fail).
- Write `game_scores` rows with correct `puzzleDate` + `playedAt` backdated.
- Run `closePeriods` for every closed day/week/month since launch → populate
  `game_champions` so trophy cases + Hall of Champions are already full.
- Idempotent: upsert on the unique keys; safe to re-run.

**Note (per project memory): `DATABASE_URL` points at PRODUCTION.** Seeding real data
means writing to prod. Confirm target before running (local docker vs prod) — I will
**not** run the seed against prod without an explicit go.

---

## 11. Tests (mandatory paths)

| File | Covers |
|------|--------|
| alfazy-periods | Mon–Sun boundaries, ISO week numbers, month/year edges, anchor round-trip |
| alfazy-scoring | solve 1..6 → 200..100, fail → 20; bestGuesses = min |
| alfazy-leaderboard | sum grouping per scope, window filter, tie-break order |
| alfazy-champions | closePeriods picks correct rank-1 per scope; idempotent upsert; anchor labels |
| alfazy-trophies | user matches individual/house/batch rows; non-member excluded |
| checkGuess | green/yellow/grey incl. duplicate-letter Wordle edge cases |

Unit tests are DB-free (pure logic). Leaderboard/champions logic extracted so the SUM
grouping can be tested on in-memory rows without Prisma.

---

## 12. UI / polish

- Member brand blue `--color-brand: #009ae4`, cards `bg-white border border-gray-200
  rounded-xl`, page width `mx-auto max-w-[1400px] px-4 sm:px-6`.
- Sidebar game list + "Back to Feed" (matches screenshots).
- Podium: gold/silver/bronze blocks, top-3 faces.
- Board: 6×5 tiles with flip reveal; on-screen QWERTY keyed by letter state.
- Leaderboard: scope tabs + period tabs (push query params), "Your Rank" strip,
  champions rail on the right with movement arrows (from prior anchor).
- House rows tinted by house colour (`colorHex` from houses config).
- lucide-react icons throughout (no emoji, no phosphor — phosphor is admin-only).

---

## 13. Open decisions (defaults chosen; override before build)

1. **Seed target:** local docker DB (safe) vs production. **Default: local**, will not
   touch prod without explicit go.
2. **Tie-break:** fewer total guesses, then earliest last-play. OK?
3. **House/batch = SUM** (confirmed). Average is a later toggle.
4. **Movement arrows:** included via prior-anchor diff (needs champions history — seed
   fills it). OK to include now.

---

## 14. Build order (once approved)

1. Schema + migration (`puzzleDate`, unique, `game_champions`).
2. `alfazy-words.ts`, `alfazy-trophies.ts`.
3. `periods.ts` → `alfazy.ts` → `leaderboard.ts` → `champions.ts` (+ tests each).
4. `actions.ts` server action.
5. `scripts/seed-alfazy.ts` (run against local).
6. Sample-run script printing leaderboards + champions to verify end-to-end.
7. UI pages + components.
8. TrophyCase into profile sidebar.
9. Cron route + GitHub Action.
10. `npm test` green, `npm run build` clean.
```
