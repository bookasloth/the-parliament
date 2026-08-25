import { describe, it, expect, vi, beforeEach } from "vitest"

const { requireUser, startMatch, redirect } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  startMatch: vi.fn(),
  redirect: vi.fn(),
}))
vi.mock("@/modules/auth/session", () => ({ requireUser }))
vi.mock("@/modules/vyapaar/match", () => ({ startMatch }))
vi.mock("next/navigation", () => ({ redirect }))

import { startMatchAction } from "@/modules/vyapaar/match-actions"
import { ForbiddenError } from "@/lib/errors"

beforeEach(() => {
  requireUser.mockReset()
  startMatch.mockReset()
  redirect.mockReset()
  requireUser.mockResolvedValue({ id: "u1" })
})

describe("startMatchAction", () => {
  it("starts the match for the session user and redirects to it", async () => {
    startMatch.mockResolvedValue({ matchId: "m1" })
    await startMatchAction("room1")
    expect(startMatch).toHaveBeenCalledWith("u1", "room1")
    expect(redirect).toHaveBeenCalledWith("/games/vyapaar/matches/m1")
  })

  it("maps a ForbiddenError to ok:false instead of redirecting", async () => {
    startMatch.mockRejectedValue(new ForbiddenError("Only the host can start the game"))
    await expect(startMatchAction("room1")).resolves.toEqual({
      ok: false,
      error: "Only the host can start the game",
    })
    expect(redirect).not.toHaveBeenCalled()
  })

  it("rethrows non-ForbiddenError failures without redirecting", async () => {
    startMatch.mockRejectedValue(new Error("db down"))
    await expect(startMatchAction("room1")).rejects.toThrow("db down")
    expect(redirect).not.toHaveBeenCalled()
  })
})
