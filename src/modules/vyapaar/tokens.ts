// Player board tokens (piece images). One permanent piece is pinned to the owner
// account; everyone else gets a stable piece derived from the matchId so it never
// reshuffles between renders/refetches (no hydration flicker).
//
// 7 pieces. Index 0 is the PERMANENT piece for PERMANENT_EMAIL; indices 1..6 are
// the pool assigned to the other seats deterministically by matchId (a table is at
// most 6 players, so the 6-piece pool always covers the non-permanent seats). Edit
// this list if the uploaded names/base change.
const CDN = "https://company-assets.bookasloth.in/nnawca/images/tokens"
export const TOKENS = [
  `${CDN}/token-1.png`, // permanent — PERMANENT_EMAIL
  `${CDN}/token-2.png`,
  `${CDN}/token-3.png`,
  `${CDN}/token-4.png`,
  `${CDN}/token-5.png`,
  `${CDN}/token-6.png`,
  `${CDN}/token-7.png`,
]

export const PERMANENT_EMAIL = "sndatarkar@gmail.com"

// djb2 string hash → 32-bit seed (deterministic, no Math.random).
function hash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h >>> 0
}

// Seeded Fisher–Yates (LCG). Pure — same (pool, seed) → same order every time.
function shuffled(pool: number[], seed: number): number[] {
  const a = pool.slice()
  let r = seed >>> 0 || 1
  for (let i = a.length - 1; i > 0; i--) {
    r = (r * 1664525 + 1013904223) >>> 0
    const j = r % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Assign a token URL per seat. `sndatarkar@gmail.com` always gets the permanent
 * piece (index 0); every other seat draws a distinct piece from the 6-piece pool
 * (indices 1..6), ordered deterministically by the matchId. A table is at most 6
 * players, so the pool covers all non-permanent seats with no collisions.
 */
export function assignTokens(players: { seat: number; email: string | null; token?: string | null }[], matchId: string): (string | null)[] {
  const out: (string | null)[] = []
  const pool = shuffled([1, 2, 3, 4, 5, 6], hash(matchId))
  let pi = 0
  for (const p of [...players].sort((a, b) => a.seat - b.seat)) {
    if (p.token) out[p.seat] = p.token // a pinned piece (e.g. a bot's own token) wins
    else if (p.email === PERMANENT_EMAIL) out[p.seat] = TOKENS[0]
    else out[p.seat] = TOKENS[pool[pi++]] ?? null
  }
  return out
}
