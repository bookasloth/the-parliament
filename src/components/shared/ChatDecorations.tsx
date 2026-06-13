"use client"

import type { CSSProperties } from "react"
import type { ChatDecoration } from "@/config/chat-themes"

/**
 * Decorative, non-interactive overlay drawn over the conversation area
 * for festive chat themes. Purely visual — pointer-events disabled.
 */
export function ChatDecorations({ decoration }: { decoration: ChatDecoration }) {
  if (decoration === "none") return null

  const preset = GLYPH_PRESETS[decoration]

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {decoration === "snow" && <Snow />}
      {decoration === "tricolour" && <Tricolour />}
      {decoration === "diwali" && <Diwali />}
      {preset && <FloatingGlyphs preset={preset} />}
    </div>
  )
}

/* ---------------- Generic floating-glyph decorations ----------------
 * One small renderer drives hearts, confetti, rain, petals, bubbles,
 * leaves, stars, and crescent themes. Positions are derived
 * deterministically from the index (no Math.random) so server and client
 * render identically — no hydration mismatch. */

type GlyphMode = "fall" | "rise" | "twinkle"

interface GlyphPreset {
  glyphs: string[]
  colors: string[]
  mode: GlyphMode
  /** [min, max] font size in px */
  size: [number, number]
  count: number
  /** base animation duration in seconds */
  dur: number
}

const GLYPH_PRESETS: Partial<Record<ChatDecoration, GlyphPreset>> = {
  hearts: { glyphs: ["♥", "❥"], colors: ["#ff4d6d", "#ff8fab", "#ffb3c6"], mode: "fall", size: [10, 20], count: 11, dur: 9 },
  confetti: { glyphs: ["●", "◆", "▰", "★", "▪"], colors: ["#ff5d8f", "#ffd119", "#4dc3ff", "#70ad47", "#a855f7"], mode: "fall", size: [6, 13], count: 16, dur: 7 },
  rain: { glyphs: ["❘"], colors: ["#9ec5e8", "#bcd9ef"], mode: "fall", size: [12, 20], count: 18, dur: 4 },
  petals: { glyphs: ["✿", "❀", "❁"], colors: ["#ffb3c6", "#ff8fab", "#ffd6e0"], mode: "fall", size: [11, 18], count: 12, dur: 10 },
  bubbles: { glyphs: ["○", "◌", "°"], colors: ["#bde0fe", "#a2d2ff", "#ffffff"], mode: "rise", size: [8, 18], count: 14, dur: 9 },
  leaves: { glyphs: ["❧", "❦", "✦"], colors: ["#70ad47", "#a7c957", "#5a8f3c"], mode: "fall", size: [11, 18], count: 11, dur: 11 },
  stars: { glyphs: ["✦", "✧", "★", "⋆"], colors: ["#fff7df", "#ffe580", "#ffffff"], mode: "twinkle", size: [7, 13], count: 18, dur: 2 },
  crescent: { glyphs: ["☾", "✦", "✧", "⋆"], colors: ["#ffe580", "#ffffff", "#d4a800"], mode: "twinkle", size: [9, 16], count: 14, dur: 2 },
}

function FloatingGlyphs({ preset }: { preset: GlyphPreset }) {
  return (
    <>
      {Array.from({ length: preset.count }).map((_, i) => {
        const left = (i * 37 + 7) % 100
        const top = ((i * 29 + 11) % 70) + 6
        const delay = ((i * 13) % 50) / 10
        const dur = preset.dur + ((i * 7) % 5)
        const sizeT = ((i * 53) % 100) / 100
        const size = preset.size[0] + sizeT * (preset.size[1] - preset.size[0])
        const glyph = preset.glyphs[i % preset.glyphs.length]
        const color = preset.colors[i % preset.colors.length]

        const animation =
          preset.mode === "twinkle"
            ? `festive-twinkle ${preset.dur + (i % 3) * 0.5}s ease-in-out ${delay}s infinite`
            : preset.mode === "rise"
            ? `festive-rise ${dur}s linear ${delay}s infinite`
            : `festive-snowfall ${dur}s linear ${delay}s infinite`

        const style: CSSProperties = {
          left: `${left}%`,
          fontSize: size,
          color,
          animation,
          top: preset.mode === "twinkle" ? `${top}%` : 0,
          textShadow: "0 1px 2px rgba(0,0,0,0.12)",
        }
        return (
          <span key={i} className="absolute leading-none" style={style}>
            {glyph}
          </span>
        )
      })}
    </>
  )
}

/* ---------------- Christmas: falling snow ---------------- */
function Snow() {
  const flakes = [
    { left: "6%", size: 10, delay: "0s", dur: "9s" },
    { left: "18%", size: 7, delay: "2.5s", dur: "11s" },
    { left: "31%", size: 12, delay: "1s", dur: "8s" },
    { left: "44%", size: 8, delay: "4s", dur: "12s" },
    { left: "57%", size: 11, delay: "0.5s", dur: "10s" },
    { left: "69%", size: 6, delay: "3s", dur: "13s" },
    { left: "80%", size: 13, delay: "1.8s", dur: "9.5s" },
    { left: "92%", size: 9, delay: "5s", dur: "11.5s" },
  ]
  return (
    <>
      {flakes.map((f, i) => (
        <span
          key={i}
          className="absolute top-0 text-white"
          style={{
            left: f.left,
            fontSize: f.size,
            animation: `festive-snowfall ${f.dur} linear ${f.delay} infinite`,
            textShadow: "0 1px 2px rgba(0,0,0,0.15)",
          }}
        >
          ❄
        </span>
      ))}
    </>
  )
}

/* ---------------- Republic / Independence Day: Ashoka chakra watermark ---------------- */
function Tricolour() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg
        viewBox="0 0 100 100"
        className="h-44 w-44 opacity-[0.07]"
        style={{ animation: "spin 60s linear infinite" }}
      >
        <circle cx="50" cy="50" r="46" fill="none" stroke="#1a3a6b" strokeWidth="3" />
        <circle cx="50" cy="50" r="6" fill="#1a3a6b" />
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 15 * Math.PI) / 180
          return (
            <line
              key={i}
              x1="50"
              y1="50"
              x2={50 + 44 * Math.cos(angle)}
              y2={50 + 44 * Math.sin(angle)}
              stroke="#1a3a6b"
              strokeWidth="1.5"
            />
          )
        })}
      </svg>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* ---------------- Diwali: diyas along the bottom + sparkles ---------------- */
function Diwali() {
  const sparkles = [
    { left: "10%", top: "18%", size: 8, delay: "0s" },
    { left: "26%", top: "32%", size: 6, delay: "0.8s" },
    { left: "48%", top: "14%", size: 10, delay: "1.5s" },
    { left: "64%", top: "28%", size: 7, delay: "0.4s" },
    { left: "82%", top: "20%", size: 9, delay: "1.1s" },
    { left: "90%", top: "40%", size: 5, delay: "2s" },
    { left: "36%", top: "46%", size: 6, delay: "1.7s" },
  ]
  const diyas = ["8%", "26%", "44%", "62%", "80%", "94%"]

  return (
    <>
      {/* Sparkles */}
      {sparkles.map((s, i) => (
        <span
          key={i}
          className="absolute text-gold-300"
          style={{
            left: s.left,
            top: s.top,
            fontSize: s.size,
            color: "#ffe580",
            animation: `festive-twinkle 2.4s ease-in-out ${s.delay} infinite`,
          }}
        >
          ✦
        </span>
      ))}
      {/* Diya row along the bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-12">
        {diyas.map((left, i) => (
          <div key={i} className="absolute bottom-1" style={{ left }}>
            <Diya delay={`${i * 0.3}s`} />
          </div>
        ))}
      </div>
    </>
  )
}

function Diya({ delay }: { delay: string }) {
  return (
    <svg width="34" height="30" viewBox="0 0 34 30">
      {/* glow */}
      <ellipse cx="17" cy="11" rx="9" ry="11" fill="#ffcf4d" opacity="0.22"
        style={{ animation: `festive-flicker 1.6s ease-in-out ${delay} infinite` }} />
      {/* flame */}
      <path
        d="M17 4 C19 8 20 10 17 14 C14 10 15 8 17 4 Z"
        fill="#ffb733"
        style={{ transformOrigin: "17px 14px", animation: `festive-flicker 1.6s ease-in-out ${delay} infinite` }}
      />
      <path d="M17 7 C18 9.5 18.5 11 17 13 C15.5 11 16 9.5 17 7 Z" fill="#fff3c4" />
      {/* lamp bowl */}
      <path d="M6 16 Q17 26 28 16 Q17 21 6 16 Z" fill="#a8521f" />
      <path d="M6 16 Q17 22 28 16 L28 17 Q17 24 6 17 Z" fill="#7c3a13" />
    </svg>
  )
}
