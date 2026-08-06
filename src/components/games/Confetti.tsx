"use client";

// Confetti flutter — pure CSS (see .alfazy-confetti-piece in globals.css). Each
// piece gets an index-derived position/colour/shape/sway so there's no random
// hydration mismatch. Mix of rectangles, ribbons and dots for a livelier burst.
// Parent unmounts after ~3s.
const COLORS = ["#009ae4", "#f59e0b", "#22c55e", "#ec4899", "#8b5cf6", "#ef4444", "#14b8a6"];
const PIECES = 120;

export default function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {Array.from({ length: PIECES }).map((_, i) => {
        const left = (i * 41) % 100; // co-prime stride → even spread
        const delay = (i % 12) * 0.06;
        const duration = 2.4 + ((i % 6) * 0.28); // 2.4s–3.8s
        const color = COLORS[i % COLORS.length];
        const sway = 14 + ((i * 7) % 46); // 14–60px horizontal drift
        const spin = 540 + ((i * 53) % 540); // 540–1080deg tumble
        const shape = i % 3; // 0 rectangle, 1 ribbon, 2 dot
        const size = 6 + ((i * 3) % 6); // 6–12px base
        return (
          <span
            key={i}
            className="alfazy-confetti-piece"
            style={{
              left: `${left}%`,
              background: color,
              width: shape === 2 ? `${size}px` : `${size}px`,
              height: shape === 1 ? `${size * 2.4}px` : shape === 2 ? `${size}px` : `${size + 5}px`,
              borderRadius: shape === 2 ? "50%" : "2px",
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              ["--sway" as string]: `${i % 2 === 0 ? sway : -sway}px`,
              ["--spin" as string]: `${i % 2 === 0 ? spin : -spin}deg`,
            }}
          />
        );
      })}
    </div>
  );
}
