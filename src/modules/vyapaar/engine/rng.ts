// Seeded PRNG (mulberry32). State lives on the GameState (`rng` field) so games
// are fully reproducible and serializable. Never use Math.random in the engine.

export function nextRng(state: { rng: number }): number {
  let t = (state.rng = (state.rng + 0x6d2b79f5) | 0) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function rollDie(state: { rng: number }): number {
  return 1 + Math.floor(nextRng(state) * 6);
}

export function shuffle<T>(arr: T[], state: { rng: number }): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(nextRng(state) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
