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
