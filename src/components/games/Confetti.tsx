"use client";

// Lightweight confetti burst — pure CSS fall (reuses the edit-confetti-fall
// keyframe). Positions/colours index-derived so there's no layout randomness to
// hydrate. Renders for ~2.5s then the parent can unmount it.
const COLORS = ["#009ae4", "#f59e0b", "#22c55e", "#ec4899", "#8b5cf6", "#ef4444"];
const PIECES = 80;

export default function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {Array.from({ length: PIECES }).map((_, i) => {
        const left = (i * 37) % 100; // spread across width
        const delay = (i % 10) * 0.08;
        const duration = 2 + ((i % 5) * 0.25);
        const color = COLORS[i % COLORS.length];
        const rot = (i * 47) % 360;
        return (
          <span
            key={i}
            className="alfazy-confetti-piece"
            style={{
              left: `${left}%`,
              background: color,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              transform: `rotate(${rot}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}
