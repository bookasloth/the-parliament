# Vyapaar M1 — Accounts + Wallet — Design

**Date:** 2026-08-24
**Status:** Approved for planning
**Parent design:** `docs/superpowers/specs/2026-08-23-vyapaar-multiplayer-design.md` (§2 wallet, §6 lifecycle, §B shell top-up). This spec fills in the M1-specific decisions; the engine (Phase 1) is already merged-pending in PR #351.

**Goal:** Give every member a play-money Vyapaar wallet — a one-time 25,000-coin welcome grant, an append-only ledger, and a **shell-funded, one-way, non-cashable** coin top-up — with the server layer, minimal UI components, RLS, and tests. No rooms, no engine wiring, no game settlement yet.

## Scope

**In:** `User` wallet fields; `VyapaarLedger` model; one-time grant (app-layer, lazy, idempotent); shell→coin top-up (atomic); coin config; wallet read helper; a reusable balance component + minimal top-up panel (no mounted page); RLS SQL; migration + backfill SQL; tests.

**Out (later milestones):** rooms (M2), realtime/lobby (M3), engine↔server wiring + game settlement + stats fields (post-M3), the Vyapaar hub page that will mount the wallet UI (M3).

## Decisions (this milestone)

1. **Grant = app-layer, lazy, idempotent.** No DB trigger. New users default `vyapaarWallet = 0`, `vyapaarGranted = false`. A helper `ensureVyapaarEnrollment(userId)` — called at the top of every wallet read/spend — atomically, only when `!vyapaarGranted`: credits `WELCOME_GRANT` (25,000), writes a `VyapaarLedger` row `enrollment_grant (+25000)`, and flips `vyapaarGranted = true`. This keeps the invariant **`vyapaarWallet == Σ ledger.delta`** exactly true at all times and makes the grant the sole crediter. Guard is the `vyapaarGranted` flag, so it fires exactly once even under concurrent calls (the `updateMany where granted=false` returning count 0 short-circuits the double-run).
2. **Wallet UI = components only, no page.** Build a server `WalletBadge` (shows balance) and a `TopUpPanel` (pack buttons → server action). Do **not** mount a dedicated page; they slot into the Vyapaar hub in M3. Logic is covered by unit tests; visual mounting waits for the hub.
3. **Stats deferred.** `gamesPlayed/wins/bestNetWorth` are written only at game-over settlement (post-M3); their columns land with that code, not here.

## Data model (Prisma)

Mirror the existing shell economy (`ShellLedger`, `creditShells`/`spendShells` in `src/modules/economy/shells.ts`).

- **`User`** += `vyapaarWallet Int @default(0) @map("vyapaar_wallet")`, `vyapaarGranted Boolean @default(false) @map("vyapaar_granted")`, and the relation `vyapaarLedger VyapaarLedger[]`.
- **`VyapaarLedger`** (append-only audit):
  ```prisma
  model VyapaarLedger {
    id        String   @id @default(uuid()) @db.Uuid
    userId    String   @map("user_id") @db.Uuid
    delta     Int
    reason    String   @db.VarChar(60)   // enrollment_grant | shell_topup | game_settlement | ...
    refId     String?  @map("ref_id") @db.VarChar(120) // packId, or later a matchId
    createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
    user User @relation(fields: [userId], references: [id], onDelete: Cascade)
    @@index([userId, createdAt])
    @@map("vyapaar_ledger")
  }
  ```
  (`matchId` from the parent design is represented by `refId` for now — no `matches` table exists in M1; a typed FK can be added in the settlement wire.)

## Coin config — `src/config/vyapaar-coins.ts`

```ts
export const WELCOME_GRANT = 25_000;
/** One-way shell → coin packs (no coin → shell reversal, no INR). */
export const COIN_PACKS = [
  { id: "coins_15k",  shells: 100,  coins: 15_000,  bonus: 0 },
  { id: "coins_40k",  shells: 250,  coins: 40_000,  bonus: 2_500 },
  { id: "coins_85k",  shells: 500,  coins: 85_000,  bonus: 10_000 },
  { id: "coins_180k", shells: 1_000, coins: 180_000, bonus: 30_000 },
  { id: "coins_400k", shells: 2_000, coins: 400_000, bonus: 80_000 },
] as const;
export type CoinPackId = (typeof COIN_PACKS)[number]["id"];
export const coinsForPack = (p: (typeof COIN_PACKS)[number]) => p.coins + p.bonus;
```

## Server layer — `src/modules/vyapaar/wallet.ts`

- `ensureVyapaarEnrollment(userId): Promise<void>` — idempotent grant (see Decision 1).
- `getVyapaarWallet(userId): Promise<number>` — ensures enrollment, returns balance.
- `topUpVyapaarCoins(userId, packId): Promise<{ wallet: number; shells: number }>` — resolve pack from config (reject unknown id); in ONE `prisma.$transaction`: ensure enrollment; re-read `shellBalance`; if `< pack.shells` throw `ForbiddenError("Insufficient shells")`; then **decrement** `shellBalance` + `ShellLedger(-shells, "vyapaar_topup", packId)` and **increment** `vyapaarWallet` + `VyapaarLedger(+coinsForPack, "shell_topup", packId)`. One-way — no path credits shells from coins.
- A server action wrapper (`"use server"`) for `TopUpPanel` calling `requireUser` then `topUpVyapaarCoins`.

## UI — `src/components/vyapaar/` (components only)

- `WalletBadge.tsx` (server) — renders the coin balance from `getVyapaarWallet`.
- `TopUpPanel.tsx` (client) — pack buttons; on click calls the top-up server action, shows the new balance / an "insufficient shells" error. Not mounted on any route this milestone.

## Security / RLS (delivered as SQL to run on prod)

Mirror `supabase/messaging-realtime-rls.sql`:
- `vyapaar_ledger`: enable RLS; policy — a user may `SELECT` only rows where `user_id = auth.uid()`; **no** client `INSERT/UPDATE/DELETE` (service-role writes only, append-only).
- `users.vyapaar_wallet` / `vyapaar_granted` are written server-side via Prisma only; there is no client write path. (Parliament reads the balance through the server helper, not supabase-js, so no client read policy is required for the wallet itself.)

## Migration delivery (mind the migrate-ledger hazard)

- **Prisma migration** (committed) for the schema additions — the two `User` columns + the `vyapaar_ledger` table — so `prisma migrate deploy` on deploy stays consistent. (I do not run `migrate`; per the standing no-DB rule the user applies it / it runs on deploy.)
- **Raw SQL** (handed over, run manually on prod) for: backfilling existing users (`vyapaar_wallet = 25000`, `vyapaar_granted = true`, one `enrollment_grant (+25000)` ledger row each) and the RLS policies.
- After applying on prod, run `prisma migrate resolve --applied <name>` if drift appears (per the deploy-migrate-ledger hazard note).

## Testing (vitest, DB-free unit tests for logic; mirror existing economy tests)

- **Grant idempotency:** `ensureVyapaarEnrollment` fires exactly once — a second call writes no new ledger row and credits nothing (mock/stub the prisma tx, or extract the guard logic).
- **Invariant:** after grant, `vyapaarWallet === Σ ledger.delta`.
- **Top-up:** a valid pack debits exactly `pack.shells`, credits exactly `coinsForPack`, writes both ledger rows with the right reasons/refId; totals still balance.
- **Insufficient shells:** top-up throws `ForbiddenError`, no balances change, no ledger rows written.
- **One-way:** there is no code path that converts coins → shells (assert by construction / absence).
- **Config math:** `coinsForPack` == coins + bonus for every pack; pack ids unique.
- Prefer extracting the pure pack-resolution + math so it tests without a DB; the transactional writes get a thin integration-style test only if a real logic branch needs it (keep unit tests DB-free per the standing rule).

## Acceptance

A member's first wallet read shows 25,000 with one `enrollment_grant` ledger row; a shell-rich member can buy a coin pack (shells down, coins up, two ledger rows, atomic); a shell-poor member is rejected with balances untouched; the wallet balance always equals the ledger sum; no coin→shell or coin→money path exists.
