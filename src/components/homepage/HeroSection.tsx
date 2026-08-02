import { SignupCard } from "./SignupCard";

// Themed "connected dots" — an alumni network as a constellation of
// house-colored nodes. Positions in a 0–100 viewBox, hand-placed so the
// links read as a network, not noise. CSS-only, no external asset.
const NODES: { x: number; y: number; c: string; r: number }[] = [
  { x: 18, y: 16, c: "#2e6da4", r: 2.6 },
  { x: 40, y: 10, c: "#3a6b23", r: 2.0 },
  { x: 66, y: 18, c: "#a53422", r: 2.8 },
  { x: 84, y: 30, c: "#ffd21f", r: 2.2 },
  { x: 30, y: 34, c: "#ff9933", r: 3.0 },
  { x: 56, y: 40, c: "#b82055", r: 2.4 },
  { x: 14, y: 52, c: "#3a6b23", r: 2.2 },
  { x: 44, y: 62, c: "#2e6da4", r: 2.8 },
  { x: 74, y: 56, c: "#ff9933", r: 2.4 },
  { x: 88, y: 70, c: "#a53422", r: 2.0 },
  { x: 26, y: 78, c: "#b82055", r: 2.6 },
  { x: 60, y: 84, c: "#ffd21f", r: 2.4 },
];
// Edges by node index — the "connections".
const EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [0, 4], [1, 4], [4, 5], [2, 5], [3, 8],
  [4, 6], [5, 7], [6, 7], [7, 8], [8, 9], [6, 10], [7, 11], [10, 11], [11, 8], [5, 8],
];

function ConnectedDots() {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <g stroke="#c2410c" strokeOpacity="0.18" strokeWidth="0.25">
        {EDGES.map(([a, b], i) => (
          <line key={i} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y} />
        ))}
      </g>
      {NODES.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={n.r} fill={n.c} className="animate-pulse" style={{ animationDelay: `${(i % 6) * 0.4}s` }} />
      ))}
    </svg>
  );
}

export function HeroSection() {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left — themed connected-dots panel */}
      <div className="relative flex min-h-[220px] flex-col justify-center overflow-hidden bg-gradient-to-br from-amber-100 via-orange-100 to-amber-50 px-8 py-14 lg:min-h-screen lg:w-[42%] lg:px-14">
        <ConnectedDots />
        <div className="relative">
          <h1 className="font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-charcoal-800 sm:text-5xl lg:text-6xl">
            Welcome to the NNAWCA!
          </h1>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-charcoal-600 sm:text-lg">
            Reconnect, reminisce, and rediscover your Navodaya family.
          </p>
        </div>
      </div>

      {/* Right — form */}
      <div className="relative flex flex-1 items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        {/* Top-right actions */}
        <div className="absolute right-6 top-6 flex items-center gap-3 sm:right-10">
          <a href="/auth/signin" className="rounded-lg bg-brand-50 px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-100">
            Already Member? Login
          </a>
          <a href="/directory" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600">
            Find an Alumni
          </a>
        </div>

        <SignupCard />
      </div>
    </div>
  );
}
