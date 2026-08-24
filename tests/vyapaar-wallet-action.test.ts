import { describe, it, expect, vi, beforeEach } from "vitest"

const { requireUser, topUpVyapaarCoins } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  topUpVyapaarCoins: vi.fn(),
}))
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
