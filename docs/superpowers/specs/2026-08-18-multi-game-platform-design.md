# Multi-Game Platform — Design

**Date:** 2026-08-18
**Status:** Draft for review
**Goal:** Grow Parliament's games from one hardcoded game (Alfazy) to a
registry-driven platform hosting three daily puzzle games — **Alfazy**,
**Hit-and-Blow**, **Integra** — mirroring the mature system on
shubhamdatarkar.com, adapted to Parliament's auth, membership, house/batch
leaderboards, champions, streaks, trophies, and nudge.

Reference system documented at
`C:\Users\shubh\OneDrive\Documents\Claude\Projects\Shubham Datarkar Website\docs\GAMES.md`.

---

## Why this is tractable

Parliament's leaderboard / champions / streak / trophy / nudge layer is already
generic in *shape* — it computes "SUM(score) over a date window, grouped by
individual/house/batch, ranked; freeze rank-1 winners." The only Alfazy-specific
bits are:

- `alfazyGameId()` (a hardcoded `where: { key: "alfazy" }` lookup)
- the `ALFAZY_CACHE_TAG` string
- `ALFAZY_LAUNCH` in `periods.ts`

`game_scores` is already keyed by `gameId`. So **every Parliament extra lights up
for a new game for free** once those hardcodes become a game parameter. The only
genuinely game-specific code is the **engine** (answer source + guess grading +
scoring) and the **board UI**.

---

## What's in / out of scope

**In:** Alfazy (unchanged behaviour), Hit-and-Blow, Integra, image-share,
archive, admin. Delivered in phases; each phase is its own spec → plan → build.

**Out:** Head-to-head challenges (dropped). Anonymous/guest play (Parliament games
are member-gated — see Auth delta). Cross-game unified leaderboard (each game keeps
its own board).

---

## Deltas from the reference site

The reference is a Supabase-auth, anon-play, RLS/RPC codebase. Parliament differs:

| Concern | Reference site | Parliament |
|---|---|---|
| Auth | Supabase auth, anon play via localStorage, guest→member folding | Auth.js; games live in `(main)` gated group → **login required already**. Drop guest/anon path entirely. |
| Anti-cheat writes | security-definer RPCs + RLS | **server actions + server-side grading** (answer never sent to client), Prisma. Already how Alfazy works. |
| Archive / feature gating | `view_archive` / `create_challenge` "capabilities" | **membership tier** (`membershipStatus`). |
| Puzzle source | in-code seeded shuffle + theme days + DB override | Alfazy keeps its DB `alfazy_words` source; new games use in-code seeded shuffle. Both satisfy one engine interface. |
| Scoring | guesses + server-timed tiebreak | Parliament's existing `score:int` SUM model (guess-based). Each engine maps its result to an int score. No timer added. |
| Karma | n/a | Stays **0** for all games (existing `GAME_KARMA_HARD_CAP`). |

**Alfazy is not rewritten.** It launches Sept 1 on its DB-word engine and admin
words page. We refactor it to *implement* the new engine interface — same words,
same day-mapping, same scoring — and add the two new games alongside.

---

## Architecture

### 1. Registry — `src/config/games.ts`

Single source of truth. One entry = one game.

```ts
export type GameKey = "alfazy" | "hit_and_blow" | "integra";

export type GameConfig = {
  key: GameKey;
  slug: string;        // URL segment, e.g. "hit-and-blow"
  name: string;
  tag: string;         // short tagline for the hub card
  tint: string;        // Tailwind accent classes
  code: string;        // short share code (/g/<code> if/when short links land)
  launchISO: string;   // this game's puzzle-#1 date (UTC) — its own epoch
  status: "live" | "coming_soon";
};
```

Lookups: `gameBySlug`, `gameByKey`, `gameByCode`, `LIVE_GAMES`.

### 2. Engine interface — `src/modules/games/engines/`

Every game implements the same contract; the board and server actions are written
against the interface, never a concrete game.

```ts
export type Tile = "correct" | "present" | "absent"; // grid games
export interface GameEngine {
  key: GameKey;
  length: number;             // cells per row
  maxGuesses: number;         // rows
  keyboard: KeyRow[];         // on-screen keyboard layout (letters | digits | symbols)
  getAnswer(puzzleNo: number): Promise<string> | string;  // authoritative, server-only
  isValidGuess(guess: string): boolean;
  grade(guess: string, answer: string): Tile[];           // per-cell feedback
  scorePlay(solved: boolean, guessesUsed: number): number; // → int for the SUM board
  shareGrid(rows: Tile[][]): string;                       // emoji grid for sharing
}
```

- **Alfazy engine** = today's `modules/games/alfazy.ts` refactored to this shape.
  `getAnswer` reads `alfazy_words` (unchanged). `grade` = existing `checkGuess`.
  `scorePlay` = existing.
- **Hit-and-Blow engine** = port from reference `hit-and-blow.ts`. 4 digits,
  9 guesses, unique digits, non-zero first. Answer = `seededShuffle(all 4536
  codes, 0x7e42d05b)[puzzleNo % 4536]`. Feedback is `{hits, blows}` → mapped to
  the `Tile[]` shape (hit=correct, blow=present, else absent) so one board renders it.
- **Integra engine** = port from reference `integra.ts`. 7-char equation, 6 guesses,
  pure `evaluate()` arithmetic parser (no `eval`). Answer = `seededShuffle(equation
  list, 0x2c9be14d)[puzzleNo % n]`.

`engines/index.ts` maps `GameKey → GameEngine`.

### 3. Per-game periods — generalize `periods.ts`

Replace the single `ALFAZY_LAUNCH` constant with a per-game launch resolved from
the registry's `launchISO`. `puzzleNumber(date, key)`, `windowFor`, `anchorFor`,
etc. take a game key (or a resolved launch date). All existing pure window/anchor
math is unchanged — only the epoch becomes a parameter.

### 4. Parameterize the shared layer

- `leaderboard.ts`: `alfazyGameId()` → `gameId(key)`; `ALFAZY_CACHE_TAG` →
  `cacheTag(key)` (e.g. `game-leaderboard:${key}`). Every exported fn gains a
  `key` argument. The aggregate/rank/streak pure functions are untouched.
- `champions.ts`: `freezeAnchor`/`closeJustEnded`/`backfillChampions`/
  `trophiesForUser` take a `key`. The champions cron freezes **all live games**.
- `nudge.ts`: message/target logic is already game-agnostic; parameterize the copy.

### 5. Dynamic routes — `/games/[slug]/*`

Collapse `games/alfazy/{page,play,results,leaderboard,champions}` into
`games/[slug]/…`. Each route resolves `gameBySlug(params.slug)`, 404s if unknown
or `coming_soon`. This is the "cut board dup" — games 2 and 3 add **zero** route
files. Keep the existing loading/skeleton components, generalized.

### 6. Shared board — `components/games/GameBoard.tsx`

Generalize `alfazy/play/page.tsx` into one config-driven client board:
`rows = engine.maxGuesses`, `cols = engine.length`, keyboard from
`engine.keyboard`, guess-check + submit via generalized server actions that take a
`gameKey`. Preserve Alfazy's current look/animations (flip, pop, shake, bounce,
confetti) as the default tile theme; per-game accent via registry `tint` +
`.{key}-tile--{state}` classes.

### 7. Server actions — generalize `alfazy/actions.ts`

`checkGuessAction(key, guess)`, `submitResultAction(key, guesses)`,
`hasPlayedTodayAction(key)`, `getTrophiesAction(userId)`, `nudgePlayerAction`.
Grading stays server-side; the answer never reaches the client. `submitResult`
writes one `game_scores` row (`karmaAwarded: 0`), unique `[game,user,puzzleDate]`.

### 8. DB

`games` is already multi-game. Insert two rows (`hit_and_blow`, `integra`) —
delivered as **raw SQL for the user to run** (per standing no-DB-access rule).
`game_scores` / `game_champions` need **no migration** (already generic). New
games are formula-driven → **no per-game word/equation tables** unless admin
overrides are wanted (Phase = Admin; default is formula-only, YAGNI).

---

### 9. Analytics — every game emits events

Parliament already has an event sink: the **`ActivityEvent`** model
(`activity_events`: `userId`, `eventType`, `entityType`, `entityId`, `metadata
Json`), used today for DAU/MAU on the admin dashboard. **Reuse it — no new
analytics table or service.** One thin server-side helper:

```ts
// modules/games/analytics.ts
emitGameEvent(userId, type, meta) →
  prisma.activityEvent.create({ data: {
    userId, eventType: type, entityType: "game", entityId: gameId,
    metadata: meta,            // always carries { gameKey, puzzleNo, ... }
  }})
```

Fire-and-forget (never block or fail a play on an analytics write — wrap in a
`.catch` that swallows). All emits are **server-side** in the generalized actions,
except `shared_result` which the client reports via a small action.

| Event | Fired in | `metadata` | Purpose |
|---|---|---|---|
| `game_started` | `startGameAction(key)` (called on board mount, once/day) | `gameKey, puzzleNo` | DAU |
| `guess_submitted` | `checkGuessAction` | `gameKey, puzzleNo, guessIndex, valid` | Difficulty tuning (give-up point, valid-guess rate) |
| `game_completed` | `submitResultAction` | `gameKey, puzzleNo, solved, guessesUsed, score` | Completion rate |
| `shared_result` | `reportShareAction(key)` (client → server on share) | `gameKey, puzzleNo, target` | Virality |
| `streak_lost` | `startGameAction` / `submitResultAction` when a gap since last play is detected | `gameKey, previousStreak` | Retention / churn signal |

`startGameAction` is new in Phase 1 (idempotent per user/day — it also becomes the
natural home for server-side solve timing if ever wanted). `streak_lost` is derived
by comparing the player's last-played day to today using the existing
`streakLength` logic; emitted once when the break is first observed. `game_started`
+ `guess_submitted` + `game_completed` + `streak_lost` land in Phase 1 (Alfazy);
`shared_result` lands in Phase 4 (image-share). New games inherit all of them free —
the emits live in the generalized actions, not per game.

## Phasing

Each phase ships independently; Alfazy stays playable throughout.

| Phase | Delivers | DB |
|---|---|---|
| **1 — Foundation** | registry, engine interface, per-game periods, parameterized leaderboard/champions/nudge, dynamic `[slug]` routes, shared `GameBoard`, generalized actions, Alfazy refactored onto the interface, hub reads registry | none (Alfazy row exists) |
| **2 — Hit-and-Blow** | engine + keyboard/tile config + registry entry `live` | insert `games` row (SQL) |
| **3 — Integra** | engine (+ arithmetic parser) + config + registry entry `live` | insert `games` row (SQL) |
| **4 — Image-share** | port reference `resultImage.ts` (1080×1350 canvas PNG) + share targets in `ShareResult` | none |
| **5 — Archive** | past-puzzle play; free window = today + yesterday; older gated by membership tier; archive submit path that does **not** touch streaks/champions | none (reuse `game_scores`; add a `source` flag column if needed — SQL) |
| **6 — Admin** | `/admin/games` section: per-game stats, players, results, and optional word/equation overrides | override tables only if overrides shipped (SQL) |

### Open decisions to confirm in Phase specs (assumptions stated now)

1. **Archive gating tier.** Assume: playing today's puzzle is free for all members;
   archive (older than yesterday) requires a **paid tier (associate and up)**.
   Confirm exact tier at Phase 5.
2. **Hit-and-Blow / Integra launch dates.** Assume each game's `launchISO` = its
   ship date (its epoch starts when it goes live), so puzzle #1 is day one. Confirm
   at Phase 2/3.
3. **Admin overrides.** Assume new games are formula-only (no DB word/equation
   tables) unless Phase 6 explicitly adds override editing. Alfazy keeps its
   existing words admin.

---

## Testing

Per project standing rule (vitest, DB-free unit tests for logic):

- **Engines** (pure): grading incl. duplicate-letter/hit-blow edge cases, valid-guess
  rejection, `scorePlay` boundaries, deterministic answer sequence per seed.
- **Per-game periods**: puzzle-number/epoch math per game, window/anchor round-trips.
- **Parameterized leaderboard/champions**: existing aggregate/rank/streak tests keep
  passing; add a two-game case proving isolation (game A scores never leak into game
  B's board).
- Integra `evaluate()` parser: order of operations, integer-only, leading-zero
  rejection, `=` balance — porting the reference test suite.
- **Analytics**: each action emits the right `eventType` with the expected
  `metadata`; a thrown analytics write does **not** fail the play (fire-and-forget);
  `streak_lost` fires exactly once on a detected gap, not on an unbroken streak.

---

## Risks / notes

- **`periods.ts` launch date is currently `2026-07-01`** but Alfazy launches Sept 1.
  This inconsistency predates this work; Phase 1 makes launch per-game, so set
  Alfazy's `launchISO` to the real launch date and confirm the intended puzzle #1
  date as part of the refactor (records were just wiped, so renumbering is safe).
- **Board generalization is the riskiest single step** — it must preserve Alfazy's
  exact feel. Mitigate: keep Alfazy tile classes/animations as the default theme;
  snapshot the current play page behaviour before refactor.
- Reference `short link` (`/g/<code>`) and SEO footers are nice-to-have, not
  required for parity; deferred (registry carries `code` so they can be added later
  with no schema change).
