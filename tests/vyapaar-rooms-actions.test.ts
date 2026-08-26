import { describe, it, expect, vi, beforeEach } from "vitest"

const { requireUser, createRoom, joinRoom, leaveRoom, setRoomVisibility, redirect } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  setRoomVisibility: vi.fn(),
  redirect: vi.fn(),
}))
vi.mock("@/modules/auth/session", () => ({ requireUser }))
vi.mock("@/modules/vyapaar/rooms", () => ({ createRoom, joinRoom, leaveRoom, setRoomVisibility }))
vi.mock("next/navigation", () => ({ redirect }))

import {
  createRoomAction,
  joinRoomAction,
  leaveRoomAction,
  setVisibilityAction,
} from "@/modules/vyapaar/rooms-actions"
import { ForbiddenError } from "@/lib/errors"

beforeEach(() => {
  requireUser.mockReset()
  createRoom.mockReset()
  joinRoom.mockReset()
  leaveRoom.mockReset()
  setRoomVisibility.mockReset()
  redirect.mockReset()
  requireUser.mockResolvedValue({ id: "u1" })
})

describe("createRoomAction", () => {
  it("creates the room for the session user and redirects to it", async () => {
    createRoom.mockResolvedValue({ code: "ABC123" })
    await createRoomAction("public")
    expect(createRoom).toHaveBeenCalledWith("u1", "public")
    expect(redirect).toHaveBeenCalledWith("/games/vyapaar/rooms/ABC123")
  })
})

describe("joinRoomAction", () => {
  it("normalizes the code, joins, and redirects on success", async () => {
    joinRoom.mockResolvedValue({ seat: 1 })
    await joinRoomAction(" abc123 ")
    expect(joinRoom).toHaveBeenCalledWith("u1", "ABC123", undefined)
    expect(redirect).toHaveBeenCalledWith("/games/vyapaar/rooms/ABC123")
  })
  it("forwards a preferred seat to joinRoom", async () => {
    joinRoom.mockResolvedValue({ seat: 3 })
    await joinRoomAction("ABC123", 3)
    expect(joinRoom).toHaveBeenCalledWith("u1", "ABC123", 3)
  })
  it("maps a ForbiddenError to ok:false instead of redirecting", async () => {
    joinRoom.mockRejectedValue(new ForbiddenError("Room is full"))
    await expect(joinRoomAction("ABC123")).resolves.toEqual({ ok: false, error: "Room is full" })
    expect(redirect).not.toHaveBeenCalled()
  })
  it("rethrows non-ForbiddenError failures", async () => {
    joinRoom.mockRejectedValue(new Error("db down"))
    await expect(joinRoomAction("ABC123")).rejects.toThrow("db down")
  })
})

describe("leaveRoomAction", () => {
  it("leaves for the session user and redirects to the hub", async () => {
    await leaveRoomAction("room-1")
    expect(leaveRoom).toHaveBeenCalledWith("u1", "room-1")
    expect(redirect).toHaveBeenCalledWith("/games/vyapaar")
  })
})

describe("setVisibilityAction", () => {
  it("returns ok:true on success", async () => {
    setRoomVisibility.mockResolvedValue(undefined)
    await expect(setVisibilityAction("room-1", "public")).resolves.toEqual({ ok: true })
    expect(setRoomVisibility).toHaveBeenCalledWith("u1", "room-1", "public")
  })
  it("maps a ForbiddenError (non-host) to ok:false", async () => {
    setRoomVisibility.mockRejectedValue(new ForbiddenError("Only the host can change visibility"))
    await expect(setVisibilityAction("room-1", "private")).resolves.toEqual({
      ok: false,
      error: "Only the host can change visibility",
    })
  })
})
