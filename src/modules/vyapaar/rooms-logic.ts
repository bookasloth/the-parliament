// Pure, DB-free room helpers (unit-tested). Orchestration lives in rooms.ts.
import { randomInt } from "node:crypto"
import { ROOM_CODE_ALPHABET, ROOM_CODE_LEN, MAX_SEATS, ROOM_TTL_DAYS } from "@/config/vyapaar-rooms"

/** Build a room code. `rand(n)` returns an int in [0,n) — defaults to crypto. */
export function generateRoomCode(rand: (n: number) => number = randomInt): string {
  let out = ""
  for (let i = 0; i < ROOM_CODE_LEN; i++) out += ROOM_CODE_ALPHABET[rand(ROOM_CODE_ALPHABET.length)]
  return out
}

/** Lowest seat in 0..MAX_SEATS-1 not in `taken`, or null if full. */
export function lowestFreeSeat(taken: number[]): number | null {
  const set = new Set(taken)
  for (let s = 0; s < MAX_SEATS; s++) if (!set.has(s)) return s
  return null
}

/** New host = the member with the lowest seat, or null if none remain. */
export function pickNewHost(members: { userId: string; seat: number }[]): string | null {
  if (members.length === 0) return null
  return members.reduce((lo, m) => (m.seat < lo.seat ? m : lo)).userId
}

/** True if a room's last activity is older than the TTL. */
export function isExpired(lastActiveAtMs: number, nowMs: number, ttlDays = ROOM_TTL_DAYS): boolean {
  return nowMs - lastActiveAtMs > ttlDays * 86_400_000
}
