/**
 * Games registry — single source of truth for every game on /games.
 * Add a game = one entry here (plus its engine in modules/games/engines).
 *
 * Each game numbers its puzzles from its OWN launch day (`launchISO`), so the
 * period/leaderboard math is per-game. `status: "coming_soon"` games 404 in the
 * routes until flipped to "live".
 */

export type GameKey = "alfazy" | "hit_and_blow" | "integra";

export interface GameConfig {
  key: GameKey;
  /** URL segment under /games/<slug>. */
  slug: string;
  name: string;
  /** One-line hub-card tagline. */
  tag: string;
  /** Tailwind gradient stops for the hub card accent, e.g. "from-brand-50 to-white". */
  tint: string;
  /** Short share code (for /g/<code> short links, when added). Unique. */
  code: string;
  /** Puzzle #1 date, UTC calendar date YYYY-MM-DD. This game's epoch. */
  launchISO: string;
  status: "live" | "coming_soon";
}

export const GAMES: GameConfig[] = [
  {
    key: "alfazy",
    slug: "alfazy",
    name: "Alfazy",
    tag: "Guess the 5-letter word",
    tint: "from-brand-50 to-white",
    code: "alfz",
    launchISO: "2026-07-01", // preserves current puzzle numbering; do not change post-launch
    status: "live",
  },
  {
    key: "hit_and_blow",
    slug: "hit-and-blow",
    name: "Hit and Blow",
    tag: "Crack the 4-digit code",
    tint: "from-sky-50 to-white",
    code: "htbl",
    launchISO: "2026-09-01",
    status: "coming_soon",
  },
  {
    key: "integra",
    slug: "integra",
    name: "Integra",
    tag: "Guess the hidden equation",
    tint: "from-violet-50 to-white",
    code: "intg",
    launchISO: "2026-09-01",
    status: "coming_soon",
  },
];

export const LIVE_GAMES = GAMES.filter((g) => g.status === "live");

export function gameByKey(key: string): GameConfig | undefined {
  return GAMES.find((g) => g.key === key);
}

export function gameBySlug(slug: string): GameConfig | undefined {
  return GAMES.find((g) => g.slug === slug);
}

export function gameByCode(code: string): GameConfig | undefined {
  return GAMES.find((g) => g.code === code);
}

/** This game's puzzle-#1 date as a UTC Date. Throws on an unknown key. */
export function launchDate(key: GameKey): Date {
  const cfg = gameByKey(key);
  if (!cfg) throw new Error(`unknown game key: ${key}`);
  const [y, m, d] = cfg.launchISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
