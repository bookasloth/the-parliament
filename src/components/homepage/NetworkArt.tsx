"use client";

import { useEffect, useRef } from "react";

// Ambient four-colour alumni network — R/G/B/Y nodes wired together, with
// packets random-walking edge to edge. Spans the whole panel as a faded
// backdrop (nodes fill a tall 100×160 canvas, sliced to cover). Bloom nodes,
// comet-trail packets, edges that light as a packet crosses, slow idle drift.
const R = "#ff5a5a", G = "#3ddc84", B = "#5b9dff", Y = "#ffd23f";
const COLORS = [R, G, B, Y];

const BASE: { x: number; y: number; c: string }[] = [
  { x: 16, y: 14, c: R },  // 0
  { x: 48, y: 10, c: G },  // 1
  { x: 82, y: 18, c: B },  // 2
  { x: 92, y: 44, c: Y },  // 3
  { x: 30, y: 34, c: B },  // 4
  { x: 64, y: 32, c: R },  // 5
  { x: 12, y: 58, c: G },  // 6
  { x: 44, y: 54, c: Y },  // 7
  { x: 78, y: 58, c: G },  // 8
  { x: 22, y: 82, c: R },  // 9
  { x: 58, y: 80, c: B },  // 10
  { x: 88, y: 84, c: Y },  // 11
  { x: 34, y: 108, c: G }, // 12
  { x: 66, y: 112, c: R }, // 13
  { x: 18, y: 134, c: B }, // 14
  { x: 52, y: 140, c: Y }, // 15
  { x: 84, y: 128, c: G }, // 16
];
const EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [0, 4], [1, 4], [1, 5], [4, 5], [2, 5], [3, 8], [5, 8],
  [4, 6], [5, 7], [6, 7], [7, 8], [3, 11], [8, 11], [6, 9], [7, 9], [7, 10], [8, 10],
  [10, 11], [9, 12], [10, 12], [10, 13], [11, 13], [12, 13], [12, 14], [13, 15],
  [13, 16], [14, 15], [15, 16], [11, 16], [9, 14],
];
const NEI: number[][] = BASE.map((_, i) =>
  EDGES.filter(([a, b]) => a === i || b === i).map(([a, b]) => (a === i ? b : a)),
);
const edgeIndex = new Map<string, number>();
EDGES.forEach(([a, b], i) => { edgeIndex.set(`${a}-${b}`, i); edgeIndex.set(`${b}-${a}`, i); });

const PACKETS = 6;
const SPEED = 32;      // viewBox units / second
const DRIFT = 1.5;     // idle wobble amplitude
const TRAIL = 6;       // comet tail dots

export function NetworkArt() {
  const nodeRef = useRef<(SVGGElement | null)[]>([]);
  const edgeRef = useRef<(SVGLineElement | null)[]>([]);
  const coreRef = useRef<(SVGCircleElement | null)[]>([]);
  const glowRef = useRef<(SVGCircleElement | null)[]>([]);
  const trailRef = useRef<(SVGCircleElement | null)[][]>([]);

  useEffect(() => {
    const rand = (n: number) => Math.floor(Math.random() * n);
    const packets = Array.from({ length: PACKETS }, () => {
      const from = rand(BASE.length);
      return {
        from, prev: from, to: NEI[from][rand(NEI[from].length)], t: Math.random(),
        color: BASE[rand(BASE.length)].c, hist: [] as { x: number; y: number }[],
      };
    });

    const t0 = performance.now();
    let last = t0, raf = 0;

    const tick = (now: number) => {
      const time = (now - t0) / 1000;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const P = BASE.map((n, i) => ({
        x: n.x + DRIFT * Math.sin(time * 0.5 + i * 1.7),
        y: n.y + DRIFT * Math.cos(time * 0.4 + i * 2.3),
      }));
      for (let i = 0; i < P.length; i++) {
        nodeRef.current[i]?.setAttribute("transform", `translate(${P[i].x - BASE[i].x} ${P[i].y - BASE[i].y})`);
      }
      for (let k = 0; k < EDGES.length; k++) {
        const [a, b] = EDGES[k];
        const el = edgeRef.current[k];
        if (!el) continue;
        el.setAttribute("x1", String(P[a].x)); el.setAttribute("y1", String(P[a].y));
        el.setAttribute("x2", String(P[b].x)); el.setAttribute("y2", String(P[b].y));
        el.setAttribute("stroke-opacity", "0.10"); el.setAttribute("stroke", "#7c8aa5");
      }

      for (let i = 0; i < packets.length; i++) {
        const p = packets[i];
        const a = P[p.from], b = P[p.to];
        const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        p.t += (SPEED * dt) / dist;

        const ei = edgeIndex.get(`${p.from}-${p.to}`);
        if (ei != null) {
          const el = edgeRef.current[ei];
          el?.setAttribute("stroke", p.color);
          el?.setAttribute("stroke-opacity", "0.4");
        }

        if (p.t >= 1) {
          p.prev = p.from; p.from = p.to;
          const opts = NEI[p.from].filter((n) => n !== p.prev);
          const pool = opts.length ? opts : NEI[p.from];
          p.to = pool[rand(pool.length)];
          p.color = COLORS[rand(COLORS.length)];
          p.t = 0;
        }

        const x = a.x + (b.x - a.x) * Math.min(p.t, 1);
        const y = a.y + (b.y - a.y) * Math.min(p.t, 1);

        p.hist.unshift({ x, y });
        if (p.hist.length > TRAIL + 1) p.hist.pop();

        coreRef.current[i]?.setAttribute("cx", String(x));
        coreRef.current[i]?.setAttribute("cy", String(y));
        const glow = glowRef.current[i];
        if (glow) { glow.setAttribute("cx", String(x)); glow.setAttribute("cy", String(y)); glow.setAttribute("fill", p.color); }

        for (let j = 0; j < TRAIL; j++) {
          const tEl = trailRef.current[i]?.[j];
          if (!tEl) continue;
          const h = p.hist[j + 1];
          if (h) {
            tEl.setAttribute("cx", String(h.x)); tEl.setAttribute("cy", String(h.y));
            tEl.setAttribute("r", String(1.4 * (1 - j / TRAIL)));
            tEl.setAttribute("fill", p.color);
            tEl.setAttribute("opacity", String(0.28 * (1 - j / TRAIL)));
          } else {
            tEl.setAttribute("opacity", "0");
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg
      viewBox="0 0 100 150"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full opacity-70"
      aria-hidden
    >
      <defs>
        <filter id="net-bloom" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        {COLORS.map((c, i) => (
          <radialGradient key={i} id={`net-glow-${i}`}>
            <stop offset="0%" stopColor={c} stopOpacity="0.4" />
            <stop offset="100%" stopColor={c} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>

      <g strokeWidth="0.4" strokeLinecap="round">
        {EDGES.map((_, i) => (
          <line key={i} ref={(el) => { edgeRef.current[i] = el; }} stroke="#7c8aa5" strokeOpacity="0.10" />
        ))}
      </g>

      {BASE.map((n, i) => (
        <g key={i} ref={(el) => { nodeRef.current[i] = el; }}>
          <circle cx={n.x} cy={n.y} r={7} fill={`url(#net-glow-${COLORS.indexOf(n.c)})`} />
          <circle cx={n.x} cy={n.y} r={2.4} fill={n.c} opacity={0.85} />
          <circle cx={n.x} cy={n.y} r={2.4} fill="none" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="0.4" />
        </g>
      ))}

      {Array.from({ length: PACKETS }, (_, i) => {
        trailRef.current[i] = trailRef.current[i] ?? [];
        return (
          <g key={i}>
            {Array.from({ length: TRAIL }, (_, j) => (
              <circle key={j} ref={(el) => { trailRef.current[i][j] = el; }} r={1} opacity={0} />
            ))}
            <circle ref={(el) => { glowRef.current[i] = el; }} r={4} filter="url(#net-bloom)" opacity={0.7} />
            <circle ref={(el) => { coreRef.current[i] = el; }} r={1.6} fill="#ffffff" opacity={0.9} />
          </g>
        );
      })}
    </svg>
  );
}
