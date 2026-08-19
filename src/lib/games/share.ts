/** Share-text builder for game results. Pure + client-safe. */

export interface ShareTextInput {
  name: string; // display name, may already include "#NNN" (archive)
  puzzleNo: number;
  solved: boolean;
  guesses: number | null; // guesses used when solved
  maxGuesses: number;
  score: number;
  /** Absolute short link, e.g. https://nnawca.org/g/alfz */
  url: string;
  /** Optional emoji grid (one row per line). */
  grid?: string;
}

/** The short-link URL for a game code against an origin. */
export function gameShareUrl(origin: string, code: string): string {
  return `${origin.replace(/\/$/, "")}/g/${code}`;
}

/** Hashtag from a game's display name: "Hit and Blow" → "#HitandBlow" (no puzzle number). */
export function gameHashtag(name: string): string {
  return `#${name.replace(/\s*#\d.*$/, "").replace(/\s+/g, "")}`;
}

/** A friendly, share-ready message: headline, emoji grid, and a beat-me + link closer. */
export function buildShareText({ name, puzzleNo, solved, guesses, maxGuesses, url, grid }: ShareTextInput): string {
  // Headline tag keeps any existing "#NNN" (archive); else append the puzzle number.
  const tag = /#\d/.test(name) ? name : `${name} #${String(puzzleNo).padStart(3, "0")}`;
  const hashtag = gameHashtag(name);
  const headline = solved ? `I Solved ${tag} in ${guesses}/${maxGuesses}` : `${tag} beat me today`;
  const gridBlock = grid ? `\n\n${grid}\n` : "\n";
  return `${headline}${gridBlock}\nTry now to beat me at ${hashtag} ${url}`;
}
