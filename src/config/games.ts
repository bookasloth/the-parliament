/**
 * Games registry — single source of truth for every game on /games.
 * Add a game = one entry here (plus its engine in modules/games/engines).
 *
 * Each game numbers its puzzles from its OWN launch day (`launchISO`), so the
 * period/leaderboard math is per-game. `status: "coming_soon"` games 404 in the
 * routes until flipped to "live".
 */

export type GameKey = "alfazy" | "hit_and_blow" | "integra" | "vyapaar";

export interface GameConfig {
  key: GameKey;
  /** URL segment under /games/<slug>. */
  slug: string;
  /** "daily" feeds the puzzle/period/leaderboard machinery; "multiplayer" (e.g. Vyapaar rooms) does not. */
  kind: "daily" | "multiplayer";
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
  /** Landing-page "how to play" bullets. */
  howTo: string[];
  /** Noun for one puzzle instance, e.g. "word", "code", "equation". */
  unit: string;
}

export const GAMES: GameConfig[] = [
  {
    key: "alfazy",
    slug: "alfazy",
    kind: "daily",
    name: "Alfazy",
    tag: "Guess the 5-letter word",
    tint: "from-emerald-50 to-white",
    code: "alfz",
    launchISO: "2026-07-01", // preserves current puzzle numbering; do not change post-launch
    status: "live",
    unit: "word",
    howTo: [
      "Guess the 5-letter word in 6 tries.",
      "Green = right letter, right spot · amber = right letter, wrong spot · grey = not in the word.",
      "Fewer guesses = higher score. Keep your streak alive!",
    ],
  },
  {
    key: "hit_and_blow",
    slug: "hit-and-blow",
    kind: "daily",
    name: "Hit and Blow",
    tag: "Crack the 4-digit code",
    tint: "from-sky-50 to-white",
    code: "htbl",
    launchISO: "2026-08-18",
    status: "live",
    unit: "code",
    howTo: [
      "Crack the secret 4-digit code in 9 tries. All four digits are different and it never starts with 0.",
      "After each guess: 🎯 hits = right digit in the right spot · 💨 blows = right digit, wrong spot.",
      "Fewer guesses = higher score. Keep your streak alive!",
    ],
  },
  {
    key: "integra",
    slug: "integra",
    kind: "daily",
    name: "Integra",
    tag: "Guess the hidden equation",
    tint: "from-violet-50 to-white",
    code: "intg",
    launchISO: "2026-08-18",
    status: "live",
    unit: "equation",
    howTo: [
      "Guess the hidden 7-character equation in 6 tries.",
      "Green = right symbol, right spot · violet = right symbol, wrong spot · grey = not used.",
      "Fewer guesses = higher score. Keep your streak alive!",
    ],
  },
  {
    key: "vyapaar",
    slug: "vyapaar",
    kind: "multiplayer",
    name: "Vyapaar",
    tag: "Multiplayer property-trading board game",
    tint: "from-amber-50 to-white",
    code: "vyap",
    launchISO: "2026-08-24",
    status: "live",
    howTo: ["Create or join a room", "Roll, buy cities, build, trade", "Highest net worth wins"],
    unit: "match",
  },
];

export const LIVE_GAMES = GAMES.filter((g) => g.status === "live");

/** Live games that feed the daily-puzzle machinery (periods/leaderboard/[slug] routes). Excludes multiplayer games like Vyapaar. */
export const DAILY_GAMES = LIVE_GAMES.filter((g) => g.kind === "daily");

/** Membership tiers that unlock the full puzzle archive (older than yesterday). */
export const PAID_TIERS = ["associate", "premium", "life", "committee"];

/** Can this member play archive puzzles older than the free window (today + yesterday)? */
export function canViewArchive(membershipStatus: string | undefined): boolean {
  return !!membershipStatus && PAID_TIERS.includes(membershipStatus);
}

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
