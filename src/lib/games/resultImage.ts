/**
 * Render a shareable result card to a PNG Blob — pure client-side canvas, no deps.
 * 1080×1350 (Instagram portrait). Branded NNAWCA card: game, puzzle number, the
 * result, score, streak, and (when available) the emoji grid. Draws with Poppins
 * once fonts are ready, falling back to a system stack.
 */

export interface ResultImageData {
  gameName: string;
  puzzleNo: number;
  solved: boolean;
  guesses: number | null; // guesses used if solved
  maxGuesses: number;
  score: number;
  streak: number;
  /** Optional emoji grid (one row per line), drawn when present. */
  grid?: string;
}

const W = 1080;
const H = 1350;
const BRAND = "#009ae4";
const INK = "#0f172a";
const MUTE = "#64748b";

function font(size: number, weight = 700): string {
  return `${weight} ${size}px Poppins, "Plus Jakarta Sans", system-ui, sans-serif`;
}

export async function renderResultImage(data: ResultImageData): Promise<Blob> {
  // Best-effort: wait for web fonts so the card isn't drawn in a fallback face.
  try {
    if (typeof document !== "undefined" && document.fonts?.ready) await document.fonts.ready;
  } catch {
    /* fonts API unavailable — draw with whatever is loaded */
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");

  // Background + top accent bar.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = BRAND;
  ctx.fillRect(0, 0, W, 24);

  ctx.textAlign = "center";

  // Header.
  ctx.fillStyle = BRAND;
  ctx.font = font(64, 800);
  ctx.fillText(data.gameName, W / 2, 200);

  ctx.fillStyle = MUTE;
  ctx.font = font(38, 600);
  ctx.fillText(`Puzzle #${String(data.puzzleNo).padStart(3, "0")}`, W / 2, 270);

  // Result headline.
  ctx.fillStyle = data.solved ? "#059669" : "#e11d48";
  ctx.font = font(150, 800);
  const headline = data.solved ? `${data.guesses}/${data.maxGuesses}` : "X";
  ctx.fillText(headline, W / 2, 470);

  ctx.fillStyle = INK;
  ctx.font = font(44, 700);
  ctx.fillText(data.solved ? "Solved" : "Missed", W / 2, 545);

  // Optional emoji grid.
  let y = 660;
  const rows = (data.grid ?? "").split("\n").filter(Boolean);
  if (rows.length) {
    ctx.font = font(72, 400);
    for (const row of rows) {
      ctx.fillText(row, W / 2, y);
      y += 92;
    }
    y += 20;
  } else {
    y = 720;
  }

  // Score + streak chips.
  ctx.fillStyle = INK;
  ctx.font = font(52, 800);
  ctx.fillText(`${data.score} pts`, W / 2, y);
  if (data.streak > 1) {
    ctx.fillStyle = "#f97316";
    ctx.font = font(40, 700);
    ctx.fillText(`🔥 ${data.streak}-day streak`, W / 2, y + 70);
  }

  // Footer.
  ctx.fillStyle = MUTE;
  ctx.font = font(36, 600);
  ctx.fillText("Play daily · nnawca.org", W / 2, H - 90);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png");
  });
}
