"use client";

import { useEffect, useRef } from "react";

/**
 * Win celebration — canvas, dependency-free. Two confetti cannons fire up-and-
 * inward from the bottom corners (the "slingshot"), and firework shells burst
 * overhead for the first couple of seconds. Everything falls under gravity and
 * fades. Runs ~3.5s then idles; the parent unmounts it. Client-only, so Math.random
 * is fine (no SSR/hydration involved).
 */
const CONFETTI_COLORS = ["#009ae4", "#f59e0b", "#22c55e", "#ec4899", "#8b5cf6", "#ef4444", "#14b8a6"];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  rot: number;
  spin: number;
  kind: "confetti" | "spark";
}

export default function WinBurst({ duration = 3500 }: { duration?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const parts: Particle[] = [];

    // Confetti cannon from a bottom corner, firing up and toward centre.
    const cannon = (originX: number, dir: 1 | -1) => {
      for (let i = 0; i < 70; i++) {
        const angle = -Math.PI / 2 + dir * (0.15 + Math.random() * 0.5); // up, angled inward
        const speed = 11 + Math.random() * 9;
        parts.push({
          x: originX,
          y: h + 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 90 + Math.random() * 50,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          size: 5 + Math.random() * 6,
          rot: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.4,
          kind: "confetti",
        });
      }
    };

    // Firework: a radial spray of sparks from one overhead point.
    const firework = (x: number, y: number) => {
      const hue = Math.floor(Math.random() * 360);
      const n = 44;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const sp = 3 + Math.random() * 4.5;
        parts.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0,
          maxLife: 55 + Math.random() * 30,
          color: `hsl(${hue + Math.random() * 40 - 20}, 90%, 60%)`,
          size: 3 + Math.random() * 2,
          rot: 0,
          spin: 0,
          kind: "spark",
        });
      }
    };

    cannon(0, 1);
    cannon(w, -1);

    const start = performance.now();
    let lastFw = 0;
    let raf = 0;

    const frame = (t: number) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, w, h);

      if (elapsed < 2200 && t - lastFw > 420) {
        lastFw = t;
        firework(w * (0.2 + Math.random() * 0.6), h * (0.18 + Math.random() * 0.34));
      }

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.vy += p.kind === "spark" ? 0.06 : 0.2; // sparks lighter
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.spin;
        p.life++;

        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        if (p.kind === "confetti") {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        if (p.life >= p.maxLife || p.y > h + 60) parts.splice(i, 1);
      }
      ctx.globalAlpha = 1;

      if ((elapsed < duration || parts.length > 0) && elapsed < duration + 2500) {
        raf = requestAnimationFrame(frame);
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [duration]);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-50" aria-hidden />;
}
