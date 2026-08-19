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

/** A friendly, share-ready message with the result, grid, a nudge, and the link. */
export function buildShareText({ name, puzzleNo, solved, guesses, maxGuesses, score, url, grid }: ShareTextInput): string {
  // If the name already carries a "#NNN", don't append another.
  const tag = /#\d/.test(name) ? name : `${name} #${String(puzzleNo).padStart(3, "0")}`;
  const headline = solved
    ? `I cracked ${tag} in ${guesses}/${maxGuesses}! 🎉`
    : `${tag} got me today 😅`;
  const nudge = solved ? `${score} pts — think you can beat me?` : `${score} pts — your turn:`;
  const gridBlock = grid ? `\n\n${grid}\n` : "\n";
  return `${headline}${gridBlock}\n${nudge}\n${url}`;
}
