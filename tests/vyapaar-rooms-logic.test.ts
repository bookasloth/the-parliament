import { describe, it, expect } from "vitest"
import { ROOM_CODE_ALPHABET, ROOM_CODE_LEN, MAX_SEATS, ROOM_TTL_DAYS } from "@/config/vyapaar-rooms"
import { generateRoomCode, lowestFreeSeat, pickNewHost, isExpired } from "@/modules/vyapaar/rooms-logic"

describe("vyapaar rooms config", () => {
  it("code alphabet excludes ambiguous chars", () => {
    expect(ROOM_CODE_LEN).toBe(6)
    for (const c of "01OIL") expect(ROOM_CODE_ALPHABET).not.toContain(c)
    expect(ROOM_CODE_ALPHABET.length).toBe(31)
  })
  it("MAX_SEATS 6, TTL 30", () => {
    expect(MAX_SEATS).toBe(6)
    expect(ROOM_TTL_DAYS).toBe(30)
  })
})

describe("generateRoomCode", () => {
  it("produces ROOM_CODE_LEN chars all from the alphabet", () => {
    const code = generateRoomCode((n) => 0) // deterministic: always index 0
    expect(code).toHaveLength(6)
    expect(code).toBe(ROOM_CODE_ALPHABET[0].repeat(6))
    for (const ch of generateRoomCode()) expect(ROOM_CODE_ALPHABET).toContain(ch)
  })
})

describe("lowestFreeSeat", () => {
  it("returns 0 for an empty room", () => expect(lowestFreeSeat([])).toBe(0))
  it("fills the lowest gap", () => {
    expect(lowestFreeSeat([0, 1])).toBe(2)
    expect(lowestFreeSeat([0, 2])).toBe(1)
    expect(lowestFreeSeat([1, 2])).toBe(0)
  })
  it("returns null when full", () => expect(lowestFreeSeat([0, 1, 2, 3, 4, 5])).toBeNull())
})

describe("pickNewHost", () => {
  it("picks the lowest remaining seat", () => {
    expect(pickNewHost([{ userId: "b", seat: 3 }, { userId: "a", seat: 1 }])).toBe("a")
  })
  it("returns null for no members", () => expect(pickNewHost([])).toBeNull())
})

describe("isExpired", () => {
  const day = 86_400_000
  it("expires past the TTL", () => {
    const now = 1_000_000_000_000
    expect(isExpired(now - 31 * day, now)).toBe(true)
    expect(isExpired(now - 29 * day, now)).toBe(false)
  })
})
