# Vyapaar — Multiplayer Board Game — Design

**Date:** 2026-08-23
**Status:** Approved for planning
**Goal:** Add **Vyapaar** — an India-themed, Monopoly-style, turn-based *real-time
multiplayer* property-trading game (2–6 players, private/public rooms, play-money
wallet) — to Parliament, by porting a balance-validated deterministic engine and
translating the build spec onto Parliament's real stack.

**Source spec:** the "Vyapaar build prompt" (self-contained; ruleset in its
Appendix A/B is authoritative). This document **reconciles that spec with
Parliament's reality** — the spec assumed Supabase Auth + raw Supabase tables +
pg_cron; Parliament runs Auth.js + Prisma + an existing Realtime bridge.

---

## Positioning — a new game *class*

Parliament already has a games platform (`src/modules/games/`, `src/config/games.ts`,
`/games/[slug]`) — but those are **single-player daily puzzles** (Alfazy,
Hit-and-Blow, Integra) built on a `GameEngine` puzzle interface + periods /
leaderboard / champions machinery.

Vyapaar is a **different runtime**: real-time, multiplayer, turn-based, room-scoped,
resumable. It does **not** implement the daily-puzzle `GameEngine` interface and
does **not** use periods/leaderboard/champions.

- Lives at `/games/vyapaar/*` inside the `(main)` gated route group → member login
  required (reuses `PrivateNavbar`, standard page width).
- Registered on the `/games` hub via a new `kind: "daily" | "multiplayer"` flag on
  `GameConfig`. Vyapaar is `kind:"multiplayer"` → gets a hub card, but the
  daily-puzzle periods/leaderboard/engine code paths **skip** non-daily entries.
- All Vyapaar code lives under `src/modules/vyapaar/` (engine, server, balance) and
  `src/app/(main)/games/vyapaar/*` (UI) + `src/app/api/vyapaar/*` (route handlers).

### Deltas from the source spec (translation table)

| Concern | Source spec | Parliament (this design) |
|---|---|---|
| Auth | Supabase Auth (email + Google) | **Auth.js** (Google + credentials), members-only. Drop Supabase Auth + guest path. `auth.uid()` → the Auth.js user id (`sub`), bridged to Realtime by `signRealtimeToken`. |
| Identity table | `profiles` 1:1 `auth.users` | Existing **`User`** model. Wallet fields added inline. |
| Data layer | Raw Supabase tables + full RLS, client writes via supabase-js | **Prisma** models, **server-side writes** via route handlers/actions. RLS only on the few client-read paths. Migrations delivered as **raw SQL you run on prod** (standing no-DB-access rule). |
| Realtime | Supabase Realtime channel per room | **Reuse** existing `src/lib/supabase-realtime.ts` (`signRealtimeToken` + `broadcast()` via service-role REST, private channels). Add a Vyapaar topic. |
| Turn timer | in-process `setTimeout` → replace with pg_cron / edge fn | **pg_cron (~10s) + pg_net HTTP POST** to a Next.js route that runs the engine auto-resolve. Sidesteps Vercel Hobby's no-sub-daily-cron limit. |
| Table names | `rooms`, `games`, `game_players`, `wallet_ledger` | **`Vyapaar*`** prefix — `Game`/`GameScore`/`GameMatch`/`MatchParticipant`/`GameChampion` already exist for the daily-puzzle + legacy match systems. |

---

## 1. The engine (crown jewel) — `src/modules/vyapaar/engine/`

Pure, deterministic, framework-free TypeScript. **Ported verbatim** from the source
spec's Appendix A/B — the ruleset is balance-validated; translate faithfully, do not
reinvent. The engine imports nothing from Supabase/Prisma/Next/HTTP.

| File | Responsibility |
|---|---|
| `data.ts` | **All** constants: `GROUPS`, `RENT`, `CITIES`, `HUB_PRICE`/`HUB_RENT`/`HUB_POS`, `START_CASH`, salaries, `GST_*`, `SET_*`, `BLEND`, `MAX_ROUNDS`, `SETS_TO_END`, `MAX_LEVEL`, and both event-card decks (opcodes). **Single source of truth; the balance harness tunes only this file.** |
| `rng.ts` | Seeded PRNG (e.g. mulberry32) kept in server-only state — dice + deck shuffle. |
| `board.ts` | 40-tile board build (corners 0/10/20/30; hubs 5/15/25/35; gst@17; income@37; upi@{3,23}; headline@{7,13,27}; remaining = cities cheapest-first). |
| `cards.ts` | Event-card opcode application (HEADLINE + UPI decks); reshuffle-on-empty (seeded). |
| `state.ts` | Types: `GameState`, `Player`, city ownership/level/mortgage, deck order, `pot`, phase (`await_roll → await_action → auction? → end_turn → next seat`), round counter, pending trade offer. |
| `engine.ts` | `createGame(seed, names[2..6])`; `applyIntent(state, seat, intent) → { state, events } \| { error }`; `publicView(state, seat)` (strips RNG/deck/hidden data → counts + scores; pending trade delivered out-of-band); `autoResolve(state)` (minimal-legal auto-play: roll → decline/auto-pass auctions → end turn); `score`/`netWorth`/win-check helpers. |

**Intents (complete verb set):** `roll`, `buy`, `decline`, `bid{amount}`,
`develop{cityId}`, `mortgage{cityId}`, `unmortgage{cityId}`,
`propose_trade{to,give,get}`, `respond_trade{accept}`, `end_turn`. Only
`bid`/`propose_trade`/`respond_trade` are legal from a non-active seat.

**Rule fidelity (port exactly, per Appendix A/B):** salary 1200 / underdog 2100;
doubles→reroll, 3 doubles→jail(10, halted 2); monsoon halt; rent rules incl.
Scrappy-Landlord ×1.25 when owner holds ≤3 cities; hubs `HUB_RENT[hubsOwned]`;
gst `min(3000, round(cash*0.10))`→pot; income 1200→pot; mandi collects pot; taxraid→jail;
sets controlled at 3/5 unmortgaged (doubles base rent, unlocks even-building, max
level 4); mortgage = price/2, unmortgage = round(price*0.55); sealed-bid auctions
on declined **cities** (ties → lowest seat, all-zero → nobody); atomic re-validated
trades (undeveloped cities only, recipient-only response); **no bankruptcy
elimination** (auto-raise: sell upgrades even → mortgage → forgive shortfall — this
is superseded by the wallet model at settlement, see §6); end when
`round > MAX_ROUNDS` or a player hits `SETS_TO_END` controlled sets (finish the
round); winner = highest `score = cash + BLEND*(netWorth - cash)`, tiebreak by
controlled sets.

**Determinism = the regression guarantee.** State is fully reproducible from
`(seed, names, action-log)`. Two mandatory tests:
- **Replay test** — replay a fixed `(seed, names, action-log)` and assert the exact
  final state. This proves the port matches the reference ruleset.
- **Money-conservation property test** — replay random legal games; assert
  `Σcash + pot` changes **only** by explicit mint/burn events (salary, card payouts,
  gst/tax). Catches accidental money creation in the port.

Engine ships and passes tests **before any Supabase/Prisma wiring** (build order).

---

## 2. Persistence — Prisma, namespaced

Existing daily-puzzle/legacy models (`Game`, `GameScore`, `GameMatch`,
`MatchParticipant`, `GameChallenge`, `GameChampion`) are **untouched**. New models:

- **`VyapaarRoom`** — `id`, `code` (unique among active), `hostId→User`,
  `visibility` (`private|public`), `status` (`open|in_game|expired`),
  `lastActiveAt`, `createdAt`.
- **`VyapaarRoomMember`** — `roomId`, `userId`, `seat` (0..5); PK `(roomId,userId)`.
- **`VyapaarMatch`** — `id`, `roomId`, `seed BigInt`, `state Json` (full engine
  state incl. server-only RNG/deck), `actionLog Json`, `status` (`active|over`),
  `activeSeat`, `turnExpiresAt`, `createdAt`.
- **`VyapaarMatchPlayer`** — `matchId`, `userId`, `seat`, `openingCash`,
  `resultCash?`, `placement?`; PK `(matchId, seat)`.
- **`VyapaarLedger`** — `id`, `userId`, `matchId?`, `delta`, `reason`
  (`enrollment_grant|game_settlement|…`), `createdAt`. **Append-only** audit.
- **On `User`** (inline, matching the existing `eggBalance`/`shellBalance` pattern):
  `vyapaarWallet Int @default(25000)`, `vyapaarGranted Boolean @default(true)`.
  Optional stats: `vyapaarGamesPlayed`, `vyapaarWins`, `vyapaarBestNetWorth` (or a
  small stats blob) — used by a leaderboard hook.

State is persisted on **every committed intent** (durability + crash-resume). The
action log enables full deterministic rebuild/audit via replay.

**Delivery:** schema edited in `prisma/schema.prisma`; the migration + all RLS/cron
SQL handed to the user as raw SQL to run on the prod Supabase (I never touch the DB).
Types via `prisma generate`.

---

## 3. Authoritative server — intent RPC

`POST /api/vyapaar/[matchId]/intent` (Node runtime, **not** edge — the engine runs
server-side):

1. `requireUser` (Auth.js session).
2. Map `user.id` → `seat` via `VyapaarMatchPlayer`. **Seat is derived server-side;
   any client-supplied seat/`from` is ignored.**
3. Validate intent field types + bounds (`cityId` in range, `bid.amount ≥ 0` and
   `≤ cash`, trade sides well-formed) **before** touching the engine.
4. Rate-limit per user (reuse Parliament's limiter).
5. Load `state` → `applyIntent(state, seat, intent)`. On `error`, return it (no
   mutation). On success: persist `state` + append to `actionLog` in **one
   transaction**; set `turnExpiresAt = now()+30s` when the turn advances; update
   `activeSeat`.
6. On game over: run the **wallet settlement** (§6) in the same transaction.
7. `broadcast(vyapaarTopic(matchId), "state", publicView)`.

**No client writes** to game/wallet/room state — every mutation goes through server
logic. The single per-seat private datum (a pending trade offer) is delivered to the
recipient via an RLS-scoped row read, **not** the broadcast.

---

## 4. Realtime — reuse the existing bridge

`src/lib/supabase-realtime.ts` already mints Supabase-format JWTs from Auth.js users
(`signRealtimeToken`) and broadcasts to private channels via the service-role REST
endpoint (`broadcast`). Add:

- `vyapaarTopic(matchId)` = `vyapaar:{matchId}`.
- Client subscribes to the private channel, renders from the broadcast `publicView`,
  annotates its own seat locally, and shows a live countdown derived from
  `turnExpiresAt`.

---

## 5. Turn timer — pg_cron + pg_net

Serverless has no long-lived process, and Vercel Hobby cannot run sub-daily crons
(known lesson: sub-daily `vercel.json` cron fails silently). So:

- On each turn start the server sets `VyapaarMatch.turnExpiresAt = now()+30s`.
- **Supabase pg_cron** runs every ~10s and uses **pg_net** to HTTP `POST` to
  `POST /api/vyapaar/cron/timeouts` (protected by a shared-secret header).
- That route finds `active` matches past their deadline, runs `autoResolve` (roll →
  decline / auto-pass auctions → end turn), persists, and broadcasts — the same
  minimal-legal auto-play the reference used, now server-triggered.
- **Stale-key guard:** the route re-checks `turnExpiresAt` (or a version counter)
  under the transaction so a turn that already advanced is not double-resolved.

The `pg_cron`/`pg_net` extension-enable + schedule SQL is delivered for the user to
run on the prod Supabase.

---

## 6. Wallet lifecycle (play money only)

Play money — no real-world value, no deposits/withdrawals/redemption, no gambling
path.

- **Grant:** 25,000 once, ever. Guarded by `User.vyapaarGranted`; writes a
  `VyapaarLedger` row `enrollment_grant`. New users default `vyapaarWallet=25000,
  vyapaarGranted=true`; existing users are backfilled by the migration (one ledger
  row each). Grant is server/service-role only — never client-writable.
- **Start:** opening cash = current `vyapaarWallet` snapshot → `openingCash` +
  engine state. Config `OPENING_CASH_MODE = 'wallet' | 'fixed'`, default `'wallet'`;
  `'fixed'` falls back to `START_CASH=7500`.
- **Play:** engine `cash` is authoritative; the wallet is **not** touched mid-game.
- **End (atomic):** `vyapaarWallet = final in-game cash`; delta → `VyapaarLedger`
  `game_settlement`; bump stats. Snapshot-at-start / settle-at-end keeps concurrent
  games from corrupting the shared wallet.
- **One active match per user** — a user with an `active` match cannot join/start
  another (server check on the join/start path). Prevents double-spending one wallet.
- **Zero-balance policy** — `ZERO_BALANCE_POLICY = 'lockout' | 'floor' | 'topup'`,
  default **`lockout`** (a 0-balance user who already got the grant can't join new
  games — "out of funds" state). Knob + a leaderboard/wallet-size matchmaking hook
  left in place (design note: `wallet-is-cash` + `lockout` risks a new-player death
  spiral; `floor`/`topup` or wallet-size matchmaking mitigate — surfaced, not built).

---

## 7. Rooms

- **Code:** 6 chars from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no `0/O/1/I/L`), unique
  among active rooms.
- **Visibility:** `private` (join by code) or `public` (also in a browsable lobby
  list). Default private, with a publish option.
- **Lifecycle:** `lastActiveAt` tracked; a pg_cron sweep marks rooms `expired` after
  `ROOM_TTL_DAYS=30` (tunable) of inactivity. Active rooms reusable indefinitely.
- **Membership persists** — rejoin by code resumes your seat.
- **Resumable matches** — full engine `state` (JSONB) + `actionLog` stored; on
  crash/restart the match continues from stored state; the log allows full
  deterministic rebuild/audit.

---

## 8. UI — `/games/vyapaar/*`

- Hub card (from the registry entry, `kind:"multiplayer"`).
- Public lobby list (`/games/vyapaar`), room screen (`/games/vyapaar/rooms/[code]`
  — seats 2–6, host start), match board (`/games/vyapaar/[matchId]`).
- Board renders entirely from the broadcast `publicView`; own seat annotated
  locally; countdown from `turnExpiresAt`. Standard page width, mobile + desktop.

---

## 9. Balance re-validation — `src/modules/vyapaar/balance/`

The economy (Appendix A) was validated for a 7,500 opening stack at 2–4 players.
This build changes the opening stack (→ 25,000) **and** max players (→ 6). Port the
Monte-Carlo balance harness (depends only on engine + `data.ts`) and re-run at
**5 and 6 players with `OPENING_CASH_MODE='wallet'` (25k opening)** before ship.
Tune **only** `data.ts`. Acceptance: no seat/strategy dominates beyond a target
win-rate band; games converge within `MAX_ROUNDS` a healthy fraction of the time.

---

## 10. Security / anti-cheat

- Seat authority from the authenticated user; client-supplied seat ignored.
- No client writes to game/wallet/room — all mutations server-side (service role /
  server session).
- **RLS** on the client-read paths: `User.vyapaarWallet` service-role-write-only;
  `VyapaarLedger` insert service-role-only + user-reads-own; room/match rows
  readable by their members; a public-room subset listable. (Mirror the existing
  `supabase/messaging-realtime-rls.sql` pattern.)
- Rate-limit the intent endpoint per user.
- Property tests: money-conservation invariant; boundary/tamper input validation.

---

## Build order (approved: engine-first)

1. **Engine** — `data.ts` + engine + `rng`/`board`/`cards`/`state`; **replay test**
   + **money-conservation test** green. (Crown jewel; zero deps; fully testable in
   isolation — de-risks everything downstream.)
2. **M1 — accounts + wallet** — `User` fields, one-time grant (guard + ledger),
   wallet display, ledger. Tests: grant fires once; ledger balances; RLS blocks
   cross-user.
3. **M2 — persistent rooms** — create/join by code, public lobby, membership
   persistence, TTL sweep. Tests: code uniqueness, rejoin restores seat, expiry.
4. **M3 — 6-player lobby + realtime shell** — seats 2–6, channel, lobby→start.
   Tests: 6-seat lobby, seat/authority mapping.
5. **Wire engine → server + cron + realtime** — intent RPC, persistence-on-intent,
   30s pg_cron auto-resolve, wallet snapshot/settlement, auctions/trades/cards over
   the wire. Tests: fixed-seed replay equals reference; timeout auto-play;
   settlement writes wallet.
6. **M5 — balance re-run + hardening** — port + re-run harness at 5–6/25k; tune
   `data.ts`; rate limiting, full RLS, anti-cheat property tests; leaderboard hook.

**Acceptance ("done"):** a 6-player game plays end-to-end across real member
accounts, survives a server restart mid-game, settles wallets correctly on finish,
and no client can act out of turn or move money.

---

## Testing (project standing rule: vitest, DB-free unit tests for logic)

- **Engine:** fixed-seed replay == reference; money-conservation; auction tie/all-zero;
  trade atomic re-validation; rent (base/set/developed/scrappy-landlord/mortgaged);
  hub rent by count; set-control at 3/5; even-building; salary/underdog; card opcodes;
  win/score/tiebreak; `autoResolve` minimal-legal.
- **Wallet:** grant-once idempotency; snapshot-at-start; settle-at-end delta ==
  ledger; one-active-match guard; zero-balance lockout.
- **Rooms:** code generation/uniqueness; rejoin seat restore; TTL expiry.
- **Server/anti-cheat:** seat derived from auth (client seat ignored); non-active
  seat rejected except bid/trade; input bounds; rate-limit.

## Open decisions (assumptions stated; confirm at their phase)

1. **Vyapaar hub tier gating** — assume free for all logged-in members (no paid tier
   to play). Confirm if premium-gating is wanted.
2. **Stats/leaderboard shape** — assume inline `User` stat fields + a simple
   wallet/wins board; confirm whether it reuses any existing leaderboard UI.
3. **pg_cron cadence** — assume 10s sweep; tune against Supabase load after M-wire.

---

## Addendum — 2026-08-24: board data v2 + monetization

Two owner-supplied tables land here and **override** parts of the source spec.

### A. Board data v2 (supersedes Appendix A cities/rent)

The abstract-group economy (`GROUPS` + shared per-group `RENT` ladder + fictional
cheapest-first cities) is **replaced** by a per-city, zoned table: 5 **zones**
(North/South/East/West/Central), 5 cities each, and **each city carries its own
7-rung rent ladder** — `[base, 1House, 2House, 3House, 1Hotel, 2Hotel, 3Hotel]`
→ development levels `0..6`, so **`MAX_LEVEL = 6`**.

| Zone | City | Buy | Base | 1H | 2H | 3H | 1Hotel | 2Hotel | 3Hotel |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|
| North | Delhi | 9000 | 450 | 900 | 1350 | 2000 | 2700 | 3600 | 4950 |
| North | Chandigarh | 6500 | 350 | 650 | 1000 | 1450 | 1950 | 2600 | 3600 |
| North | Jaipur | 5800 | 300 | 600 | 850 | 1300 | 1750 | 2300 | 3200 |
| North | Lucknow | 5200 | 250 | 500 | 800 | 1150 | 1550 | 2100 | 2850 |
| North | Dehradun | 4200 | 200 | 400 | 650 | 950 | 1250 | 1700 | 2300 |
| South | Bengaluru | 8800 | 450 | 900 | 1300 | 1950 | 2650 | 3500 | 4850 |
| South | Hyderabad | 8000 | 400 | 800 | 1200 | 1750 | 2400 | 3200 | 4400 |
| South | Chennai | 7500 | 400 | 750 | 1100 | 1650 | 2250 | 3000 | 4100 |
| South | Kochi | 4800 | 250 | 500 | 700 | 1050 | 1450 | 1900 | 2650 |
| South | Coimbatore | 4500 | 250 | 450 | 700 | 1000 | 1350 | 1800 | 2500 |
| East | Kolkata | 7200 | 350 | 700 | 1100 | 1600 | 2150 | 2900 | 3950 |
| East | Bhubaneswar | 5000 | 250 | 500 | 750 | 1100 | 1500 | 2000 | 2750 |
| East | Guwahati | 4600 | 250 | 450 | 700 | 1000 | 1400 | 1850 | 2550 |
| East | Patna | 4300 | 200 | 450 | 650 | 950 | 1300 | 1700 | 2350 |
| East | Ranchi | 3800 | 200 | 400 | 550 | 850 | 1150 | 1500 | 2100 |
| West | Mumbai | 9500 | 500 | 950 | 1450 | 2100 | 2850 | 3800 | 5250 |
| West | Pune | 6800 | 350 | 700 | 1000 | 1500 | 2050 | 2700 | 3750 |
| West | Ahmedabad | 6200 | 300 | 600 | 950 | 1350 | 1850 | 2500 | 3400 |
| West | Surat | 5500 | 300 | 550 | 850 | 1200 | 1650 | 2200 | 3000 |
| West | Vadodara | 4400 | 200 | 450 | 650 | 950 | 1300 | 1750 | 2400 |
| Central | Indore | 5600 | 300 | 550 | 850 | 1250 | 1700 | 2250 | 3100 |
| Central | Bhopal | 4900 | 250 | 500 | 750 | 1100 | 1450 | 1950 | 2700 |
| Central | Nagpur | 4700 | 250 | 450 | 700 | 1050 | 1400 | 1900 | 2600 |
| Central | Raipur | 4000 | 200 | 400 | 600 | 900 | 1200 | 1600 | 2200 |
| Central | Jabalpur | 3500 | 200 | 350 | 500 | 800 | 1050 | 1400 | 1900 |

**Rules kept as mechanics (table gives no column for them):**
- **Zone = the "set".** Control a zone at 3 of its 5 unmortgaged cities
  (`SET_OWN_NEEDED = 3`). Controlling a zone **doubles base rent** on its
  undeveloped cities (`rent[0] * 2`) and unlocks development.
- **Upgrade cost** is not in the table → `upgradeCost(city) = round(price *
  UPGRADE_COST_RATIO)`, default `UPGRADE_COST_RATIO = 0.1` (10% of buy per level).
  **Tunable in `data.ts` by the balance harness.**
- Scrappy Landlord (×1.25 when owner holds ≤3 cities), mortgage (price/2),
  unmortgage (round(price*0.55)) unchanged.

> ⚠ **These numbers are NOT balance-validated.** They replace the validated
> Appendix A economy, so the "port, don't reinvent" guarantee no longer covers the
> economy. Salary (1200/2100), `MAX_ROUNDS` (12), and the 25,000 opening stack must
> be **re-validated against these prices** by the M5 balance harness; expect to tune
> `data.ts` constants. The engine mechanics are still ported verbatim — only the
> data changed.

### B. Monetization — coins topped up with SHELLS (no direct real-money path)

**Owner decision (2026-08-24):** the INR→coin store is dropped. Coins are bought
with **shells** — Parliament's existing commercial currency (`src/config/shells.ts`,
`ShellLedger`, `User.shellBalance`) — **not** with INR directly, and the top-up is
**one-way and non-cashable**: shells → coins only; coins never convert back to
shells or money.

Why this defuses the gambling concern: the real-money boundary stays where it
already is (the Shell Store, which sells shells for INR and is already live). Vyapaar
coins sit *behind* that boundary — they have **no cash-out path**, so coins won or
lost on dice are never redeemable for value. That keeps Vyapaar "play money" in the
legally relevant sense even though a shell-rich player can top up. (The wider
real-money-gaming review still belongs to whoever owns the shell economy, not to
Vyapaar.)

**Shell → coin table** (mirrors the old coin totals, priced in shells; ~₹1 ≈ 1 shell
today, so the rupee cost is unchanged for the player, with a bulk bonus that scales
150 → 240 coins/shell):

| Shells | Coins | Bonus | Total coins |
|--:|--:|--:|--:|
| Free (welcome) | 25,000 | — | 25,000 |
| 100 | 15,000 | 0 | 15,000 |
| 250 | 40,000 | +2,500 | 42,500 |
| 500 | 85,000 | +10,000 | 95,000 |
| 1,000 | 180,000 | +30,000 | 210,000 |
| 2,000 | 400,000 | +80,000 | 480,000 |

**Build placement:** the shell→coin top-up is a **wallet feature → built in M1**
(accounts + wallet), not a separate phase. Concretely in M1: a server action debits
`shellBalance` (writing a `ShellLedger` row) and credits `vyapaarWallet` (writing a
`VyapaarLedger` row, reason `shell_topup`) atomically in one transaction; reject if
`shellBalance` is insufficient; the exchange table lives in a config module
(`src/config/vyapaar-coins.ts`) alongside the free 25,000 grant. Respect the existing
shell conventions where they apply. No INR, no Razorpay SKU, no coin→shell reversal.
The engine is unaffected — the wallet stays an opaque integer.
