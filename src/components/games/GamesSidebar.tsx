"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Grid3x3, Scissors, HelpCircle, Layers, Route as RouteIcon,
  Calculator, Type, Grid2x2, ArrowLeft, type LucideIcon,
} from "lucide-react";

interface GameLink {
  key: string;
  name: string;
  Icon: LucideIcon;
  href?: string; // present = live
}

// Order matches the design mocks. Only Alfazy is live; the rest are placeholders.
const GAMES: GameLink[] = [
  { key: "tic-tac-toe", name: "Tic Tac Toe", Icon: Grid3x3 },
  { key: "rock-paper-scissors", name: "Rock Paper Scissors", Icon: Scissors },
  { key: "guess-the-number", name: "Guess the Number", Icon: HelpCircle },
  { key: "memory-flip", name: "Memory Flip", Icon: Layers },
  { key: "maze-escape", name: "Maze Escape", Icon: RouteIcon },
  { key: "quick-math-duel", name: "Quick Math Duel", Icon: Calculator },
  { key: "alfazy", name: "Alfazy", Icon: Type, href: "/games/alfazy" },
  { key: "sudoku-mini", name: "Sudoku Mini", Icon: Grid2x2 },
];

export default function GamesSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-full lg:w-64 lg:flex-shrink-0">
      <div className="rounded-xl border border-gray-200 bg-white p-2">
        <nav className="flex flex-col">
          {GAMES.map((g) => {
            const active = g.href && pathname.startsWith(g.href);
            const cls = `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-semibold transition-colors ${
              active
                ? "bg-brand-50 text-brand"
                : g.href
                  ? "text-gray-700 hover:bg-gray-50"
                  : "cursor-not-allowed text-gray-400"
            }`;
            const inner = (
              <>
                <g.Icon className={`h-[18px] w-[18px] ${active ? "text-brand" : g.href ? "text-gray-500" : "text-gray-300"}`} />
                <span className="truncate">{g.name}</span>
                {!g.href && <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-gray-300">soon</span>}
              </>
            );
            return g.href ? (
              <Link key={g.key} href={g.href} className={cls}>
                {inner}
              </Link>
            ) : (
              <div key={g.key} className={cls} aria-disabled>
                {inner}
              </div>
            );
          })}
        </nav>
        <div className="mt-1 border-t border-gray-100 pt-1">
          <Link href="/feed" className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[14px] font-semibold text-brand hover:bg-brand-50">
            <ArrowLeft className="h-[18px] w-[18px]" /> Back to Feed
          </Link>
        </div>
      </div>
    </aside>
  );
}
