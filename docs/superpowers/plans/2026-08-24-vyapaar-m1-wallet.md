# Vyapaar M1 — Accounts + Wallet — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A play-money Vyapaar wallet for every member — a one-time 25,000-coin grant (lazy + idempotent), an append-only ledger, and an atomic **shell → coin** top-up (one-way, non-cashable) — with server layer, minimal UI components, RLS, and tests.

**Architecture:** Mirrors Parliament's existing shell economy (`src/modules/economy/shells.ts`, `ShellLedger`). Pure decision logic is DB-free and unit-tested; the Prisma-transaction orchestration is integration-tested against the local `*_test` DB (same as `tests/integration/membership-claim.itest.ts`). The wallet balance obeys the invariant **`vyapaarWallet == Σ vyapaar_ledger.delta`**. No rooms, no engine wiring, no game settlement.

**Tech Stack:** Next.js/TypeScript, Prisma 7 (generated client at `@/generated/prisma`, singleton `@/lib/prisma`), vitest (`tests/**/*.test.ts` unit + `tests/integration/*.itest.ts` integration), Tailwind, `lucide-react` icons.

## Global Constraints

- **Play money only, one-way.** Coins are credited by the welcome grant and by shell top-ups. There is **no** code path that converts coins → shells or coins → money.
- **Invariant:** `vyapaarWallet == Σ vyapaar_ledger.delta` holds after every committed operation. Every wallet mutation writes a matching ledger row in the SAME transaction.
- **Grant fires exactly once per user**, guarded by `vyapaarGranted` (a race-safe `updateMany where vyapaarGranted=false`).
- **No DB access from the implementer.** Do not run `prisma migrate dev`, `prisma db push`, or any command that connects to a database EXCEPT the local throwaway `*_test` DB used by `npm run test:integration` (its guard hard-fails on any non-local DB). `npx prisma generate` and `npx prisma validate` are codegen/validation only (no DB) and are allowed.
- **Naming/style:** double-quoted strings, **no semicolons** in new `.ts` under `src/modules`/`src/config` (match `src/modules/economy/shells.ts`). Prisma: camelCase fields mapped to snake_case via `@map`, model → table via `@@map`.
- **Errors:** throw `ForbiddenError` from `@/lib/errors` for user-facing rejections (as `shells.ts` does).
- **Config values (verbatim):** `WELCOME_GRANT = 25_000`. Packs: `{coins_15k: 100sh→15000}`, `{coins_40k: 250sh→40000+2500}`, `{coins_85k: 500sh→85000+10000}`, `{coins_180k: 1000sh→180000+30000}`, `{coins_400k: 2000sh→400000+80000}`.

---

### Task 1: Coin config + pure top-up logic

**Files:**
- Create: `src/config/vyapaar-coins.ts`
- Create: `src/modules/vyapaar/wallet-logic.ts`
- Test: `tests/vyapaar-coins.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `WELCOME_GRANT`, `COIN_PACKS`, `CoinPackId`, `coinsForPack(pack)` (from config); `planTopUp(shellBalance, packId): TopUpPlan` (pure) from wallet-logic. `TopUpPlan = { ok:false; error:"unknown_pack"|"insufficient_shells" } | { ok:true; packId; shellCost; coinCredit }`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/vyapaar-coins.test.ts
import { describe, it, expect } from "vitest"
import { COIN_PACKS, WELCOME_GRANT, coinsForPack } from "@/config/vyapaar-coins"
import { planTopUp } from "@/modules/vyapaar/wallet-logic"

describe("vyapaar coin config", () => {
  it("welcome grant is 25000", () => expect(WELCOME_GRANT).toBe(25000))
  it("has 5 packs with unique ids", () => {
    expect(COIN_PACKS).toHaveLength(5)
    expect(new Set(COIN_PACKS.map((p) => p.id)).size).toBe(5)
  })
  it("coinsForPack = coins + bonus", () => {
    expect(coinsForPack(COIN_PACKS[0])).toBe(15000) // 15000 + 0
    expect(coinsForPack(COIN_PACKS[1])).toBe(42500) // 40000 + 2500
    expect(coinsForPack(COIN_PACKS[4])).toBe(480000) // 400000 + 80000
  })
  it("coins per shell improves with bigger packs", () => {
    const rates = COIN_PACKS.map((p) => coinsForPack(p) / p.shells)
    for (let i = 1; i < rates.length; i++) expect(rates[i]).toBeGreaterThanOrEqual(rates[i - 1])
  })
})

describe("planTopUp", () => {
  it("rejects an unknown pack", () => {
    expect(planTopUp(9999, "nope")).toEqual({ ok: false, error: "unknown_pack" })
  })
  it("rejects when shells are short", () => {
    expect(planTopUp(99, "coins_15k")).toEqual({ ok: false, error: "insufficient_shells" })
  })
  it("plans a valid top-up with exact shell cost and coin credit", () => {
    expect(planTopUp(100, "coins_15k")).toEqual({
      ok: true,
      packId: "coins_15k",
      shellCost: 100,
      coinCredit: 15000,
    })
    expect(planTopUp(5000, "coins_400k")).toEqual({
      ok: true,
      packId: "coins_400k",
      shellCost: 2000,
      coinCredit: 480000,
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/vyapaar-coins.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/config/vyapaar-coins.ts
/** Play-money Vyapaar coins. One-way shell → coin packs; coins never convert back. */
export const WELCOME_GRANT = 25_000

export const COIN_PACKS = [
  { id: "coins_15k", shells: 100, coins: 15_000, bonus: 0 },
  { id: "coins_40k", shells: 250, coins: 40_000, bonus: 2_500 },
  { id: "coins_85k", shells: 500, coins: 85_000, bonus: 10_000 },
  { id: "coins_180k", shells: 1_000, coins: 180_000, bonus: 30_000 },
  { id: "coins_400k", shells: 2_000, coins: 400_000, bonus: 80_000 },
] as const

export type CoinPackId = (typeof COIN_PACKS)[number]["id"]

export function coinsForPack(pack: (typeof COIN_PACKS)[number]): number {
  return pack.coins + pack.bonus
}
```

```ts
// src/modules/vyapaar/wallet-logic.ts
// Pure, DB-free wallet decision logic (unit-tested). The DB orchestration lives in wallet.ts.
import { COIN_PACKS, coinsForPack, type CoinPackId } from "@/config/vyapaar-coins"

export type TopUpPlan =
  | { ok: false; error: "unknown_pack" | "insufficient_shells" }
  | { ok: true; packId: CoinPackId; shellCost: number; coinCredit: number }

export function planTopUp(shellBalance: number, packId: string): TopUpPlan {
  const pack = COIN_PACKS.find((p) => p.id === packId)
  if (!pack) return { ok: false, error: "unknown_pack" }
  if (shellBalance < pack.shells) return { ok: false, error: "insufficient_shells" }
  return { ok: true, packId: pack.id, shellCost: pack.shells, coinCredit: coinsForPack(pack) }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/vyapaar-coins.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config/vyapaar-coins.ts src/modules/vyapaar/wallet-logic.ts tests/vyapaar-coins.test.ts
git commit -m "feat(vyapaar): coin config + pure top-up planning logic"
```

---

### Task 2: Prisma schema + migration + client generate

**Files:**
- Modify: `prisma/schema.prisma` (add two `User` fields + `VyapaarLedger` model)
- Create: `prisma/migrations/<timestamp>_vyapaar_wallet/migration.sql` (DDL only)
- Create: `supabase/vyapaar-wallet-rls.sql` (RLS, applied manually — mirrors `supabase/messaging-realtime-rls.sql`)

**Interfaces:**
- Consumes: nothing.
- Produces: the `prisma.user.vyapaarWallet`/`vyapaarGranted` fields and the `prisma.vyapaarLedger` model on the generated client, used by Task 3.

**Design notes:**
- No data backfill is needed: existing users get `vyapaar_granted=false` from the column default, so the lazy grant in Task 3 credits them on first wallet touch exactly like new users.
- Match the newest existing migration folder format (`YYYYMMDDHHMMSS_name`, e.g. look at `prisma/migrations/20260822010000_business_posts_review_replies/`). Provider is `postgresql`.
- RLS goes in `supabase/*.sql` (Parliament's convention — see `supabase/messaging-realtime-rls.sql`), NOT in the Prisma migration.

- [ ] **Step 1: Edit `prisma/schema.prisma`**

Add these two fields to the `User` model, next to `shellBalance`:

```prisma
  eggBalance           Int       @default(20) @map("egg_balance")
  shellBalance         Int       @default(0) @map("shell_balance")
  vyapaarWallet        Int       @default(0) @map("vyapaar_wallet")
  vyapaarGranted       Boolean   @default(false) @map("vyapaar_granted")
```

Add the relation field to the `User` model (next to its other relation lists, e.g. near `shellLedger ShellLedger[]`):

```prisma
  vyapaarLedger            VyapaarLedger[]
```

Add the model near the `ShellLedger` model:

```prisma
// ── Economy: Vyapaar wallet (play-money game coins) ─────────
model VyapaarLedger {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  delta     Int
  reason    String   @db.VarChar(60)
  refId     String?  @map("ref_id") @db.VarChar(120)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@map("vyapaar_ledger")
}
```

- [ ] **Step 2: Validate the schema (no DB)**

Run: `npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid 🚀"

- [ ] **Step 3: Generate the client (no DB)**

Run: `npx prisma generate`
Expected: client generated to `src/generated/prisma` with `VyapaarLedger` + the new `User` fields.

- [ ] **Step 4: Hand-write the migration.sql**

Create `prisma/migrations/<timestamp>_vyapaar_wallet/migration.sql` (pick a timestamp later than the newest existing folder). DDL only:

```sql
-- AlterTable: Vyapaar wallet fields on users
ALTER TABLE "users" ADD COLUMN "vyapaar_wallet" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "vyapaar_granted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: append-only wallet ledger
CREATE TABLE "vyapaar_ledger" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" VARCHAR(60) NOT NULL,
    "ref_id" VARCHAR(120),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "vyapaar_ledger_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vyapaar_ledger_user_id_created_at_idx" ON "vyapaar_ledger"("user_id", "created_at");

ALTER TABLE "vyapaar_ledger" ADD CONSTRAINT "vyapaar_ledger_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 5: Write the RLS file**

First read `supabase/messaging-realtime-rls.sql` to match its exact `auth.uid()` idiom and policy-naming style, then create `supabase/vyapaar-wallet-rls.sql`:

```sql
-- Vyapaar wallet ledger: a user reads only their own rows; all writes are
-- service-role only (append-only audit). Run manually on prod (like messaging RLS).
ALTER TABLE "vyapaar_ledger" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vyapaar_ledger_select_own" ON "vyapaar_ledger";
CREATE POLICY "vyapaar_ledger_select_own" ON "vyapaar_ledger"
  FOR SELECT USING ("user_id" = auth.uid());
-- No INSERT/UPDATE/DELETE policies: only the service role (which bypasses RLS) writes.
```

(If `supabase/messaging-realtime-rls.sql` casts `auth.uid()` differently, e.g. `auth.uid()::uuid` or compares to a text column, match that exactly.)

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/generated/prisma supabase/vyapaar-wallet-rls.sql
git commit -m "feat(vyapaar): wallet + ledger schema, migration, RLS"
```

---

### Task 3: Wallet orchestration (grant, read, top-up) + integration test

**Files:**
- Create: `src/modules/vyapaar/wallet.ts`
- Test: `tests/integration/vyapaar-wallet.itest.ts`

**Interfaces:**
- Consumes: `@/lib/prisma`, `@/lib/errors` (`ForbiddenError`), `@/config/vyapaar-coins` (`WELCOME_GRANT`), `./wallet-logic` (`planTopUp`).
- Produces: `ensureVyapaarEnrollment(userId): Promise<void>`; `getVyapaarWallet(userId): Promise<number>`; `topUpVyapaarCoins(userId, packId): Promise<{ wallet: number; shells: number }>`.

**Design notes:**
- `ensureVyapaarEnrollment`: race-safe idempotency via a guarded `updateMany where vyapaarGranted:false`. Only when it updates a row (count>0) does it write the `enrollment_grant` ledger row — both in one `$transaction`, so the invariant never breaks.
- `topUpVyapaarCoins`: ensure enrollment first, then in one `$transaction` do a guarded `updateMany where shellBalance:{gte:cost}` that decrements shells + increments coins atomically; if it updates 0 rows, throw `ForbiddenError("Insufficient shells")` (race-safe — no overspend); then write both ledger rows.

- [ ] **Step 1: Write the failing integration test**

```ts
// tests/integration/vyapaar-wallet.itest.ts
import { describe, it, expect, beforeAll } from "vitest"
import "./guard"
import { prisma } from "@/lib/prisma"
import {
  ensureVyapaarEnrollment,
  getVyapaarWallet,
  topUpVyapaarCoins,
} from "@/modules/vyapaar/wallet"
import { WELCOME_GRANT } from "@/config/vyapaar-coins"

async function makeUser(shells = 0) {
  return prisma.user.create({
    data: {
      email: `vyapaar_${crypto.randomUUID()}@test.local`,
      legalName: "Test",
      shellBalance: shells,
    },
    select: { id: true },
  })
}

async function ledgerSum(userId: string) {
  const rows = await prisma.vyapaarLedger.findMany({ where: { userId }, select: { delta: true } })
  return rows.reduce((n, r) => n + r.delta, 0)
}

describe("vyapaar wallet", () => {
  it("grants 25000 exactly once (idempotent) and keeps wallet == ledger sum", async () => {
    const u = await makeUser()
    await ensureVyapaarEnrollment(u.id)
    await ensureVyapaarEnrollment(u.id) // second call must be a no-op
    const wallet = await getVyapaarWallet(u.id)
    expect(wallet).toBe(WELCOME_GRANT)
    expect(await ledgerSum(u.id)).toBe(WELCOME_GRANT)
    const grantRows = await prisma.vyapaarLedger.count({
      where: { userId: u.id, reason: "enrollment_grant" },
    })
    expect(grantRows).toBe(1)
  })

  it("tops up coins against shells atomically (both ledgers, balances move)", async () => {
    const u = await makeUser(600) // enough for coins_15k (100 shells)
    const res = await topUpVyapaarCoins(u.id, "coins_15k")
    expect(res.shells).toBe(500)
    expect(res.wallet).toBe(WELCOME_GRANT + 15000)
    expect(await ledgerSum(u.id)).toBe(WELCOME_GRANT + 15000)
    const shellSpend = await prisma.shellLedger.findFirst({
      where: { userId: u.id, reason: "vyapaar_topup" },
      select: { delta: true, refId: true },
    })
    expect(shellSpend).toMatchObject({ delta: -100, refId: "coins_15k" })
  })

  it("rejects a top-up when shells are short, changing nothing", async () => {
    const u = await makeUser(50) // < 100
    await getVyapaarWallet(u.id) // grant first
    await expect(topUpVyapaarCoins(u.id, "coins_15k")).rejects.toThrow(/insufficient/i)
    const user = await prisma.user.findUnique({
      where: { id: u.id },
      select: { shellBalance: true, vyapaarWallet: true },
    })
    expect(user).toMatchObject({ shellBalance: 50, vyapaarWallet: WELCOME_GRANT })
    expect(await prisma.shellLedger.count({ where: { userId: u.id, reason: "vyapaar_topup" } })).toBe(0)
    expect(await prisma.vyapaarLedger.count({ where: { userId: u.id, reason: "shell_topup" } })).toBe(0)
  })

  it("rejects an unknown pack", async () => {
    const u = await makeUser(9999)
    await expect(topUpVyapaarCoins(u.id, "nope")).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `docker compose -f docker/docker-compose.yml up -d` (if not already up), then `npm run test:integration -- vyapaar-wallet`
Expected: FAIL — `@/modules/vyapaar/wallet` not found. (If Docker/local Postgres is unavailable in this environment, note it in the report and rely on `tests/vyapaar-coins.test.ts` for logic coverage — do NOT point the integration guard at any non-local DB.)

- [ ] **Step 3: Write the implementation**

```ts
// src/modules/vyapaar/wallet.ts
import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/lib/errors"
import { WELCOME_GRANT } from "@/config/vyapaar-coins"
import { planTopUp } from "./wallet-logic"

/** One-time welcome grant. Idempotent: the guarded updateMany credits exactly once. */
export async function ensureVyapaarEnrollment(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const granted = await tx.user.updateMany({
      where: { id: userId, vyapaarGranted: false },
      data: { vyapaarGranted: true, vyapaarWallet: { increment: WELCOME_GRANT } },
    })
    if (granted.count > 0) {
      await tx.vyapaarLedger.create({
        data: { userId, delta: WELCOME_GRANT, reason: "enrollment_grant" },
      })
    }
  })
}

/** Current coin balance (grants on first read). */
export async function getVyapaarWallet(userId: string): Promise<number> {
  await ensureVyapaarEnrollment(userId)
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { vyapaarWallet: true },
  })
  if (!u) throw new ForbiddenError("User not found")
  return u.vyapaarWallet
}

/** Buy coins with shells. One-way, atomic, race-safe. */
export async function topUpVyapaarCoins(
  userId: string,
  packId: string,
): Promise<{ wallet: number; shells: number }> {
  await ensureVyapaarEnrollment(userId)
  return prisma.$transaction(async (tx) => {
    const u = await tx.user.findUnique({ where: { id: userId }, select: { shellBalance: true } })
    if (!u) throw new ForbiddenError("User not found")
    const plan = planTopUp(u.shellBalance, packId)
    if (!plan.ok) {
      throw new ForbiddenError(plan.error === "unknown_pack" ? "Unknown coin pack" : "Insufficient shells")
    }
    // Race-safe: only decrement if shells still suffice at write time.
    const moved = await tx.user.updateMany({
      where: { id: userId, shellBalance: { gte: plan.shellCost } },
      data: {
        shellBalance: { decrement: plan.shellCost },
        vyapaarWallet: { increment: plan.coinCredit },
      },
    })
    if (moved.count === 0) throw new ForbiddenError("Insufficient shells")
    await tx.shellLedger.create({
      data: { userId, delta: -plan.shellCost, reason: "vyapaar_topup", refId: plan.packId },
    })
    await tx.vyapaarLedger.create({
      data: { userId, delta: plan.coinCredit, reason: "shell_topup", refId: plan.packId },
    })
    const after = await tx.user.findUnique({
      where: { id: userId },
      select: { shellBalance: true, vyapaarWallet: true },
    })
    return { wallet: after!.vyapaarWallet, shells: after!.shellBalance }
  })
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm run test:integration -- vyapaar-wallet`
Expected: PASS (4 tests). Also run `npx vitest run tests/vyapaar-coins.test.ts` to confirm no regression. If the local DB is unavailable, report that the integration run could not execute and confirm the unit suite is green.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/modules/vyapaar/wallet.ts tests/integration/vyapaar-wallet.itest.ts
git commit -m "feat(vyapaar): wallet grant, read, and atomic shell top-up"
```

---

### Task 4: Server action + wallet UI components

**Files:**
- Create: `src/modules/vyapaar/wallet-actions.ts` (`"use server"`)
- Create: `src/components/vyapaar/WalletBadge.tsx` (server component)
- Create: `src/components/vyapaar/TopUpPanel.tsx` (client component)
- Test: `tests/vyapaar-wallet-action.test.ts`

**Interfaces:**
- Consumes: `@/modules/auth/session` (`requireUser`), `@/modules/vyapaar/wallet`, `@/config/vyapaar-coins`.
- Produces: `topUpAction(packId): Promise<{ ok: true; wallet: number; shells: number } | { ok: false; error: string }>`; `<WalletBadge/>`, `<TopUpPanel/>`. Not mounted on any route this milestone.

**Design notes:**
- `topUpAction` derives the user from the session (`requireUser`) — never trusts a client-supplied userId — calls `topUpVyapaarCoins`, and returns a plain result object (catches `ForbiddenError` → `{ ok:false, error }`).
- Keep components minimal; the real page mounting them arrives in M3. Verify `requireUser`'s exact export/signature by reading `src/modules/auth/session.ts` first.

- [ ] **Step 1: Write the failing test (action error mapping — the one piece with logic)**

```ts
// tests/vyapaar-wallet-action.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

const requireUser = vi.fn()
const topUpVyapaarCoins = vi.fn()
vi.mock("@/modules/auth/session", () => ({ requireUser }))
vi.mock("@/modules/vyapaar/wallet", () => ({ topUpVyapaarCoins }))

import { topUpAction } from "@/modules/vyapaar/wallet-actions"
import { ForbiddenError } from "@/lib/errors"

beforeEach(() => {
  requireUser.mockReset()
  topUpVyapaarCoins.mockReset()
  requireUser.mockResolvedValue({ id: "u1" })
})

describe("topUpAction", () => {
  it("returns ok with balances on success", async () => {
    topUpVyapaarCoins.mockResolvedValue({ wallet: 40000, shells: 400 })
    await expect(topUpAction("coins_15k")).resolves.toEqual({ ok: true, wallet: 40000, shells: 400 })
    expect(topUpVyapaarCoins).toHaveBeenCalledWith("u1", "coins_15k")
  })
  it("maps a ForbiddenError to ok:false", async () => {
    topUpVyapaarCoins.mockRejectedValue(new ForbiddenError("Insufficient shells"))
    await expect(topUpAction("coins_15k")).resolves.toEqual({ ok: false, error: "Insufficient shells" })
  })
  it("derives the user from the session, ignoring any client input", async () => {
    topUpVyapaarCoins.mockResolvedValue({ wallet: 1, shells: 1 })
    await topUpAction("coins_15k")
    expect(requireUser).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/vyapaar-wallet-action.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

First read `src/modules/auth/session.ts` to confirm `requireUser`'s shape (it returns the session user; adjust the `.id` access if the shape differs).

```ts
// src/modules/vyapaar/wallet-actions.ts
"use server"

import { requireUser } from "@/modules/auth/session"
import { topUpVyapaarCoins } from "@/modules/vyapaar/wallet"
import { ForbiddenError } from "@/lib/errors"

export async function topUpAction(
  packId: string,
): Promise<{ ok: true; wallet: number; shells: number } | { ok: false; error: string }> {
  const user = await requireUser()
  try {
    const res = await topUpVyapaarCoins(user.id, packId)
    return { ok: true, ...res }
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, error: e.message }
    throw e
  }
}
```

```tsx
// src/components/vyapaar/WalletBadge.tsx
import { Coins } from "lucide-react"
import { getVyapaarWallet } from "@/modules/vyapaar/wallet"

export async function WalletBadge({ userId }: { userId: string }) {
  const balance = await getVyapaarWallet(userId)
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
      <Coins className="h-4 w-4" aria-hidden />
      {balance.toLocaleString("en-IN")}
    </span>
  )
}
```

```tsx
// src/components/vyapaar/TopUpPanel.tsx
"use client"

import { useState, useTransition } from "react"
import { COIN_PACKS, coinsForPack } from "@/config/vyapaar-coins"
import { topUpAction } from "@/modules/vyapaar/wallet-actions"

export function TopUpPanel() {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function buy(packId: string) {
    setMsg(null)
    start(async () => {
      const res = await topUpAction(packId)
      setMsg(res.ok ? `Balance: ${res.wallet.toLocaleString("en-IN")} coins` : res.error)
    })
  }

  return (
    <div className="grid gap-2">
      {COIN_PACKS.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={pending}
          onClick={() => buy(p.id)}
          className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <span>{coinsForPack(p).toLocaleString("en-IN")} coins</span>
          <span className="text-gray-500">{p.shells} shells</span>
        </button>
      ))}
      {msg && <p className="text-sm text-gray-600">{msg}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run tests/vyapaar-wallet-action.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check + lint the new files**

Run: `npx tsc --noEmit` (clean). Optionally `npm run lint`.

- [ ] **Step 6: Commit**

```bash
git add src/modules/vyapaar/wallet-actions.ts src/components/vyapaar tests/vyapaar-wallet-action.test.ts
git commit -m "feat(vyapaar): wallet top-up server action + balance/top-up UI components"
```

---

## Self-Review

**Spec coverage (`docs/superpowers/specs/2026-08-24-vyapaar-m1-wallet-design.md`):**
- `User` wallet fields + `VyapaarLedger` → Task 2. ✓
- Coin config (`vyapaar-coins.ts`) + welcome grant constant → Task 1. ✓
- Lazy idempotent grant + `wallet == Σledger` invariant → Task 3 (`ensureVyapaarEnrollment`) + integration test. ✓
- Atomic one-way shell→coin top-up, insufficient rejection → Task 3 + integration test. ✓
- Wallet read helper → Task 3 (`getVyapaarWallet`). ✓
- Balance component + top-up panel (no page) → Task 4. ✓
- Server action deriving user from session → Task 4. ✓
- RLS (ledger user-read-own, service-write-only) → Task 2 (`supabase/vyapaar-wallet-rls.sql`). ✓
- Migration (DDL) → Task 2. Backfill correctly dropped — lazy grant subsumes it (design's backfill was belt-and-suspenders; noted). ✓
- Tests: pure logic unit-tested (Task 1), money paths integration-tested (Task 3), action logic unit-tested (Task 4). ✓

**Deferred (correctly out of M1):** rooms, engine wiring, game settlement, stats fields, the hub page that mounts the UI.

**Placeholder scan:** none — every step has real code.

**Type consistency:** `planTopUp`/`TopUpPlan`, `WELCOME_GRANT`, `coinsForPack`, `CoinPackId`, `ensureVyapaarEnrollment`/`getVyapaarWallet`/`topUpVyapaarCoins`, `topUpAction` names are consistent across tasks. `VyapaarLedger` fields (`delta`/`reason`/`refId`) match between the schema (Task 2) and the writes (Task 3).

**Known simplifications (`ponytail:`):**
- No data backfill — the lazy grant credits existing users on first touch, so a migration-time backfill is redundant.
- Wallet UI is components only (no route) — mounting waits for the M3 hub, per the approved spec.
- `refId` (not a typed `matchId` FK) carries the pack id now and will carry a match id at settlement, since no `matches` table exists in M1.
