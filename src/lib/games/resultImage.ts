/**
 * Render a shareable result card to a PNG Blob — pure client-side canvas, no deps.
 * Styled like the player's own feed post: avatar, name, batch, the "I Solved …"
 * line, the real colour grid (rounded tiles for word/equation games, hit/blow
 * pegs for Hit and Blow — no numbers), and the beat-me link. Poppins throughout.
 */

import type { GuessResult } from "@/modules/games/engines";

export interface ResultPalette {
  correct: string;
  present: string;
  absent: string;
  hit: string;
  blow: string;
}

export interface ResultImageData {
  gameName: string;
  puzzleNo: number;
  solved: boolean;
  guesses: number | null;
  maxGuesses: number;
  /** cells per row (word length / code length). */
  cols: number;
  /** graded rows — tiles get coloured squares, counts get hit/blow pegs. */
  results: GuessResult[];
  palette: ResultPalette;
  accent: string;
  hashtag: string; // "#Alfazy"
  url: string; // short link
  /** poster identity */
  name: string;
  batchLabel?: string;
  avatarUrl?: string;
  verified?: boolean;
}

const W = 1080;
const H = 1350;
const PAD = 76;
const INK = "#0f172a";
const MUTE = "#667085";
const LINE = "#e6e9ee";
const VERIFY = "#1d9bf0";

function poppins(size: number, weight = 500): string {
  return `${weight} ${size}px Poppins, "Segoe UI", system-ui, sans-serif`;
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function renderResultImage(data: ResultImageData): Promise<Blob> {
  try {
    if (typeof document !== "undefined" && document.fonts?.ready) await document.fonts.ready;
  } catch {
    /* fonts API unavailable */
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  // ── header: avatar + name + batch ──
  const av = 104;
  const avX = PAD;
  const avY = PAD;
  ctx.save();
  ctx.beginPath();
  ctx.arc(avX + av / 2, avY + av / 2, av / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  let drewAvatar = false;
  if (data.avatarUrl) {
    try {
      const img = await loadImg(data.avatarUrl);
      ctx.drawImage(img, avX, avY, av, av);
      drewAvatar = true;
    } catch {
      /* CORS / load failed — fall back to initial */
    }
  }
  if (!drewAvatar) {
    ctx.fillStyle = data.accent;
    ctx.fillRect(avX, avY, av, av);
    ctx.fillStyle = "#ffffff";
    ctx.font = poppins(52, 600);
    ctx.textAlign = "center";
    ctx.fillText((data.name[0] || "?").toUpperCase(), avX + av / 2, avY + av / 2 + 18);
    ctx.textAlign = "left";
  }
  ctx.restore();

  const nameX = avX + av + 26;
  ctx.fillStyle = INK;
  ctx.font = poppins(42, 600);
  const nameW = ctx.measureText(data.name).width;
  ctx.fillText(data.name, nameX, avY + 44);
  if (data.verified) {
    const bx = nameX + nameW + 20;
    const by = avY + 30;
    ctx.fillStyle = VERIFY;
    ctx.beginPath();
    ctx.arc(bx, by, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(bx - 7, by);
    ctx.lineTo(bx - 1.5, by + 6);
    ctx.lineTo(bx + 8, by - 6);
    ctx.stroke();
  }
  if (data.batchLabel) {
    ctx.fillStyle = MUTE;
    ctx.font = poppins(30, 400);
    ctx.fillText(data.batchLabel, nameX, avY + 92);
  }

  // divider
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, avY + av + 34);
  ctx.lineTo(W - PAD, avY + av + 34);
  ctx.stroke();

  // ── headline ──
  const hy = avY + av + 108;
  ctx.font = poppins(46, 500);
  const pn = `#${String(data.puzzleNo).padStart(3, "0")}`;
  const result = data.solved ? ` in ${data.guesses}/${data.maxGuesses}` : ` — not today`;
  const parts: { t: string; c: string }[] = [
    { t: data.solved ? "I Solved " : "I played ", c: INK },
    { t: `${data.gameName} `, c: INK },
    { t: pn, c: data.accent },
    { t: result, c: INK },
  ];
  let cx = PAD;
  for (const p of parts) {
    ctx.fillStyle = p.c;
    ctx.fillText(p.t, cx, hy);
    cx += ctx.measureText(p.t).width;
  }

  // ── grid ──
  const rows = data.results;
  const cols = data.cols;
  const gridW = W - PAD * 2;
  const gap = 16;
  const cell = Math.min(96, (gridW - gap * (cols - 1)) / cols);
  const gx = PAD;
  let gy = hy + 60;

  for (const r of rows) {
    for (let c = 0; c < cols; c++) {
      const x = gx + c * (cell + gap);
      if (r.kind === "tiles") {
        const t = r.tiles[c];
        ctx.fillStyle = t === "correct" ? data.palette.correct : t === "present" ? data.palette.present : data.palette.absent;
        rr(ctx, x, gy, cell, cell, 14);
        ctx.fill();
      } else {
        // Hit and Blow — pegs: hits first, then blows, then empty. No numbers.
        const kind = c < r.hits ? "hit" : c < r.hits + r.blows ? "blow" : "none";
        ctx.fillStyle = kind === "hit" ? data.palette.hit : kind === "blow" ? data.palette.blow : data.palette.absent;
        ctx.beginPath();
        ctx.arc(x + cell / 2, gy + cell / 2, cell / 2 - 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    gy += cell + gap;
  }

  // ── CTA (pinned near bottom) ──
  const cy = H - PAD - 46;
  ctx.font = poppins(34, 500);
  ctx.fillStyle = INK;
  const lead = "Try now to beat me at ";
  ctx.fillText(lead, PAD, cy);
  const tagX = PAD + ctx.measureText(lead).width;
  ctx.fillStyle = data.accent;
  ctx.font = poppins(34, 600);
  ctx.fillText(data.hashtag, tagX, cy);
  ctx.font = poppins(30, 500);
  ctx.fillStyle = data.accent;
  ctx.fillText(data.url, PAD, cy + 46);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}
