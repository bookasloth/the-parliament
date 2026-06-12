"use client";

import { useRef } from "react";
import { motion } from "framer-motion";

interface Node {
  x: number;
  y: number;
  r: number;
  label?: string;
}

const nodes: Node[] = [
  { x: 50, y: 30, r: 5, label: "Alumni" },
  { x: 20, y: 60, r: 4, label: "Events" },
  { x: 80, y: 55, r: 4, label: "Businesses" },
  { x: 35, y: 85, r: 3.5 },
  { x: 65, y: 80, r: 3.5 },
  { x: 50, y: 50, r: 6, label: "You" },
  { x: 15, y: 35, r: 3 },
  { x: 85, y: 35, r: 3 },
  { x: 30, y: 15, r: 3 },
  { x: 70, y: 15, r: 3 },
  { x: 10, y: 80, r: 3 },
  { x: 90, y: 78, r: 3 },
  { x: 50, y: 90, r: 4, label: "Community" },
];

const connections = [
  [0, 5], [1, 5], [2, 5], [12, 5],
  [0, 1], [0, 2], [1, 2],
  [0, 6], [0, 7], [0, 8], [0, 9],
  [2, 10], [2, 11],
  [12, 0], [12, 1], [12, 2],
  [8, 5], [9, 5], [6, 1], [7, 2],
  [10, 5], [11, 5],
];

const dashLens = connections.map(() => 2 + Math.random() * 3);
const durations = nodes.map(() => 2 + Math.random() * 2);

export function NetworkVisualization() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative w-full aspect-square max-w-[360px] mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a3a6b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#1a3a6b" stopOpacity="0" />
          </radialGradient>
        </defs>

        {connections.map(([from, to], i) => {
          const dashLen = dashLens[i];
          return (
            <motion.line
              key={`line-${i}`}
              x1={nodes[from].x}
              y1={nodes[from].y}
              x2={nodes[to].x}
              y2={nodes[to].y}
              stroke="#1a3a6b"
              strokeWidth={0.6}
              strokeOpacity={0.2}
              initial={{ pathLength: 0, strokeOpacity: 0.1 }}
              animate={{
                pathLength: [0, 1, 1, 0],
                strokeOpacity: [0.1, 0.4, 0.4, 0.1],
              }}
              transition={{
                duration: 4,
                delay: i * 0.15,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              strokeDasharray={`${dashLen} ${dashLen * 2}`}
            />
          );
        })}

        {nodes.map((node, i) => (
          <g key={`node-${i}`}>
            <circle cx={node.x} cy={node.y} r={node.r + 3} fill="url(#nodeGlow)" />
            <motion.circle
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={i === 5 ? "#d4a800" : "#1a3a6b"}
              initial={{ scale: 0.8, opacity: 0.6 }}
              animate={{
                scale: [0.8, 1.1, 0.8],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: durations[i],
                delay: i * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </g>
        ))}
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[10px] font-semibold text-gold-500 uppercase tracking-wider">Discover</p>
          <p className="text-xs font-semibold text-brand">Your Network</p>
        </div>
      </div>
    </div>
  );
}
