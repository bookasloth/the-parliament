"use client"

import type { ChatDecoration } from "@/config/chat-themes"

/**
 * Decorative, non-interactive overlay drawn over the conversation area
 * for festive chat themes. Purely visual — pointer-events disabled.
 */
export function ChatDecorations({ decoration }: { decoration: ChatDecoration }) {
  if (decoration === "none") return null

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {decoration === "snow" && <Snow />}
      {decoration === "tricolour" && <Tricolour />}
      {decoration === "diwali" && <Diwali />}
    </div>
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
