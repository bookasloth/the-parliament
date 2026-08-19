/**
 * Render a shareable result card to a PNG Blob — pure client-side canvas, no deps.
 * Styled like the player's own feed post: avatar, name, batch, the "I Solved …"
 * line, the real colour grid (rounded tiles for word/equation games, hit/blow
 * pegs for Hit and Blow — no numbers), and the beat-me link. Poppins throughout.
 */

import type { GuessResult } from "@/modules/games/engines";
import { verifiedSealColor } from "@/config/membership-colors";

// The app's verified seal (scalloped burst + tick) — replicated on canvas.
const SEAL =
  "M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z";
const SEAL_TICK = "M8.6 12.4l2.3 2.3 4.6-5";

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
  /** membership tier — colours the verified seal (life gold, student green, else blue). */
  membershipStatus?: string;
}

const W = 1080;
const H = 1350;
const PAD = 76;
const INK = "#0f172a";
const MUTE = "#667085";
const LINE = "#e6e9ee";

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
    const size = 44;
    const sx = nameX + nameW + 14;
    const sy = avY + 44 - size * 0.86; // align with the name's cap height
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(size / 24, size / 24);
    ctx.fillStyle = verifiedSealColor(data.membershipStatus);
    ctx.fill(new Path2D(SEAL));
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(new Path2D(SEAL_TICK));
    ctx.restore();
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
  const gap = 14;
  const gx = PAD;
  let gy = hy + 60;
  // Size the cell so the FULL board (maxGuesses rows) fits above the CTA — so a
  // 9-row Hit and Blow never overflows and the emoji shrink to match.
  const availH = H - PAD - 150 - gy;
  const rowCount = Math.max(1, data.maxGuesses);
  const cell = Math.min(
    88,
    (gridW - gap * (cols - 1)) / cols,
    (availH - gap * (rowCount - 1)) / rowCount,
  );

  for (const r of rows) {
    if (r.kind === "tiles") {
      for (let c = 0; c < cols; c++) {
        const x = gx + c * (cell + gap);
        const t = r.tiles[c];
        ctx.fillStyle = t === "correct" ? data.palette.correct : t === "present" ? data.palette.present : data.palette.absent;
        rr(ctx, x, gy, cell, cell, 14);
        ctx.fill();
      }
    } else {
      // Hit and Blow — 🎯 per hit, 💨 per blow (no numbers, no padding).
      const s = "🎯".repeat(r.hits) + "💨".repeat(r.blows);
      ctx.font = `${Math.round(cell * 0.86)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(s, gx, gy + cell * 0.82);
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
