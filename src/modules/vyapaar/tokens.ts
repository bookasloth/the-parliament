// Player board tokens (piece images). One permanent piece is pinned to the owner
// account; everyone else gets a stable piece derived from the matchId so it never
// reshuffles between renders/refetches (no hydration flicker).
//
// ⚠️ Upload the 7 images at these exact names, OR edit this list to match your
// uploads. Index 0 is the PERMANENT piece for PERMANENT_EMAIL; 1..6 are the pool
// randomly (but deterministically) assigned to the other seats.
const CDN = "https://company-assets.bookasloth.in/nnawc/images/tokens"
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
 * piece (index 0); every other seat draws a distinct piece from the 6-piece pool,
 * ordered deterministically by the matchId. Returns an array indexed by seat.
 * Up to 6 players fit the pool exactly, so there are never collisions.
 */
export function assignTokens(players: { seat: number; email: string | null }[], matchId: string): (string | null)[] {
  const out: (string | null)[] = []
  const pool = shuffled([1, 2, 3, 4, 5, 6], hash(matchId))
  let pi = 0
  for (const p of [...players].sort((a, b) => a.seat - b.seat)) {
    if (p.email === PERMANENT_EMAIL) out[p.seat] = TOKENS[0]
    else out[p.seat] = TOKENS[pool[pi++]] ?? null
  }
  return out
}
