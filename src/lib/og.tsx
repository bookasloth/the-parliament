import { ImageResponse } from "next/og"
import type { ReactNode } from "react"
import { LOGO_DATA_URL } from "@/lib/og-logo"

// ───────────────────────── Shared OG render kit ─────────────────────────
// One skeleton for every opengraph-image route: logo + NNAWCA top-left,
// nnawca.org bottom-left, EST. 2023 top-right, house-colour bar bottom,
// Plus Jakarta Sans. Callers pass a headline, subtitle, and a right-side
// illustration. Keeps all 6 buckets visually identical except the swaps.

export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = "image/png"

export const C = {
  blue: "#5a9bd5",
  green: "#70ad47",
  yellow: "#ffe135",
  orange: "#ff9933",
  red: "#e8503a",
  pink: "#e75480",
  brand: "#009ae4",
  navy: "#0c1d3d",
  grey: "#5b6675",
}
const HOUSE_BAR = [C.blue, C.green, C.yellow, C.orange, C.red, C.pink]
export const HOUSE_CYCLE = [C.blue, C.green, C.yellow, C.orange, C.red, C.pink]

async function loadFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    }).then((r) => r.text())
    const url = css.match(/src: url\((.+?)\) format/)?.[1]
    if (!url) return null
    return await fetch(url).then((r) => r.arrayBuffer())
  } catch {
    return null
  }
}

type FontDef = { name: string; data: ArrayBuffer; weight: 600 | 800; style: "normal" }
let _fonts: Promise<FontDef[]> | null = null
export function ogFonts(): Promise<FontDef[]> {
  if (!_fonts) {
    _fonts = Promise.all([loadFont("Plus+Jakarta+Sans", 600), loadFont("Plus+Jakarta+Sans", 800)]).then(
      ([w6, w8]) =>
        [
          w6 && { name: "Jakarta", data: w6, weight: 600 as const, style: "normal" as const },
          w8 && { name: "Jakarta", data: w8, weight: 800 as const, style: "normal" as const },
        ].filter(Boolean) as FontDef[],
    )
  }
  return _fonts
}

// ── illustrations ──

/** The alumni-network cluster (Homepage / Default). */
export function clusterArt(): ReactNode {
  const N = [
    { x: 285, y: 265, r: 48, c: C.brand },
    { x: 285, y: 92, r: 36, c: C.yellow },
    { x: 442, y: 158, r: 36, c: C.green },
    { x: 478, y: 312, r: 36, c: C.blue },
    { x: 410, y: 452, r: 36, c: C.pink },
    { x: 262, y: 480, r: 36, c: C.green },
    { x: 118, y: 436, r: 36, c: C.orange },
    { x: 86, y: 282, r: 36, c: C.red },
    { x: 146, y: 138, r: 36, c: C.blue },
  ]
  const E: [number, number][] = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8],
    [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 1],
  ]
  return (
    <svg width={520} height={520} viewBox="0 0 560 560" fill="none" xmlns="http://www.w3.org/2000/svg">
      {E.map(([a, b], i) => (
        <line key={`e${i}`} x1={N[a].x} y1={N[a].y} x2={N[b].x} y2={N[b].y} stroke="#c9d2df" strokeWidth={3} />
      ))}
      {N.map((n, i) => (
        <g key={`n${i}`}>
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.c} />
          <circle cx={n.x} cy={n.y - n.r * 0.22} r={n.r * 0.3} fill="#ffffff" />
          <path d={`M ${n.x - n.r * 0.5} ${n.y + n.r * 0.52} a ${n.r * 0.5} ${n.r * 0.5} 0 0 1 ${n.r} 0 Z`} fill="#ffffff" />
        </g>
      ))}
    </svg>
  )
}

/** A grid of member tiles (Directory). */
export function directoryArt(): ReactNode {
  const tiles = [C.blue, C.green, C.yellow, C.orange, C.red, C.pink]
  return (
    <div style={{ display: "flex", flexWrap: "wrap", width: 460, gap: 22 }}>
      {tiles.map((c, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: 138,
            height: 138,
            borderRadius: 24,
            background: "#ffffff",
            border: "1px solid #e6eaf0",
            boxShadow: "0 8px 24px rgba(12,29,61,0.06)",
          }}
        >
          <div style={{ display: "flex", width: 62, height: 62, borderRadius: 62, background: c, alignItems: "center", justifyContent: "center" }}>
            <svg width={40} height={40} viewBox="0 0 40 40">
              <circle cx={20} cy={15} r={7} fill="#fff" />
              <path d="M 8 34 a 12 12 0 0 1 24 0 Z" fill="#fff" />
            </svg>
          </div>
          <div style={{ display: "flex", width: 76, height: 8, borderRadius: 8, background: "#eef1f6", marginTop: 12 }} />
          <div style={{ display: "flex", width: 50, height: 7, borderRadius: 7, background: "#f2f4f8", marginTop: 7 }} />
        </div>
      ))}
    </div>
  )
}

/** A circular avatar with a house-coloured ring — used by dynamic cards. */
export function avatarArt(src: string | null, ring: string, initials: string): ReactNode {
  return (
    <div style={{ display: "flex", width: 380, height: 380, borderRadius: 380, background: ring, alignItems: "center", justifyContent: "center" }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} width={344} height={344} alt="" style={{ borderRadius: 344, objectFit: "cover" }} />
      ) : (
        <div style={{ display: "flex", width: 344, height: 344, borderRadius: 344, background: "#fff", alignItems: "center", justifyContent: "center", fontSize: 150, fontWeight: 800, color: ring }}>
          {initials}
        </div>
      )}
    </div>
  )
}

/** A calendar tile (Event, when there's no banner). */
export function calendarArt(month: string, day: string, ring = C.brand): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 320, height: 340, borderRadius: 32, background: "#ffffff", border: "1px solid #e6eaf0", boxShadow: "0 14px 40px rgba(12,29,61,0.10)", overflow: "hidden" }}>
      <div style={{ display: "flex", height: 92, background: ring, alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 800, color: "#fff", letterSpacing: 4 }}>
        {month.toUpperCase()}
      </div>
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", fontSize: 150, fontWeight: 800, color: C.navy }}>
        {day}
      </div>
    </div>
  )
}

/** A rounded banner/cover image (Event with a bannerUrl). */
export function bannerArt(src: string, ring = C.brand): ReactNode {
  return (
    <div style={{ display: "flex", width: 400, height: 400, borderRadius: 28, background: ring, padding: 10 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} width={380} height={380} alt="" style={{ borderRadius: 20, objectFit: "cover" }} />
    </div>
  )
}

// ── the frame ──

export interface OgCardProps {
  eyebrow?: string
  titleLines: { text: string; color?: string }[]
  subtitle?: string
  right?: ReactNode
  badge?: string
  /** shrink title for long dynamic strings */
  titleSize?: number
}

export async function renderOgCard(props: OgCardProps): Promise<ImageResponse> {
  const { eyebrow = "NNAWCA", titleLines, subtitle, right, badge = "EST. 2023", titleSize = 66 } = props
  const logo = LOGO_DATA_URL
  const fonts = await ogFonts()
  const font = fonts.length ? "Jakarta" : "sans-serif"

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          fontFamily: font,
          background: "linear-gradient(135deg, #ffffff 0%, #eef1f6 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 70,
            right: 40,
            width: 560,
            height: 560,
            borderRadius: 560,
            background: "radial-gradient(circle at 50% 45%, rgba(0,154,228,0.12), rgba(112,173,71,0.10) 45%, rgba(255,255,255,0) 70%)",
            display: "flex",
          }}
        />

        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 640, padding: "0 64px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} width={78} height={78} alt="" />
            <div style={{ fontSize: 30, fontWeight: 800, color: C.navy, marginLeft: 14, letterSpacing: 3 }}>{eyebrow}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 30 }}>
            {titleLines.map((l, i) => (
              <div key={i} style={{ fontSize: titleSize, fontWeight: 800, color: l.color ?? C.navy, lineHeight: 1.05 }}>
                {l.text}
              </div>
            ))}
          </div>

          {subtitle && <div style={{ fontSize: 24, fontWeight: 600, color: C.grey, marginTop: 24 }}>{subtitle}</div>}

          <div style={{ display: "flex", alignItems: "center", marginTop: 46 }}>
            <div style={{ width: 13, height: 13, borderRadius: 13, background: C.brand, marginRight: 12, display: "flex" }} />
            <div style={{ fontSize: 27, fontWeight: 600, color: C.brand }}>nnawca.org</div>
          </div>
        </div>

        {/* RIGHT illustration */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>{right ?? clusterArt()}</div>

        {/* badge */}
        <div style={{ position: "absolute", top: 40, right: 54, fontSize: 22, fontWeight: 600, color: "#9aa4b2", letterSpacing: 2, display: "flex" }}>
          {badge}
        </div>

        {/* house bar */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex" }}>
          {HOUSE_BAR.map((c) => (
            <div key={c} style={{ flex: 1, height: 12, background: c, display: "flex" }} />
          ))}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  )
}
