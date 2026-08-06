import Link from "next/link";
import { Type, Gamepad2, Trophy } from "lucide-react";
import { LeftRailShell } from "@/components/shared/ProfileSidebar";
import { SIDEBAR_NAV } from "@/config/sidebar-nav";

export const metadata = { title: "Games · The Parliament" };

export default function GamesLandingPage() {
  return (
    <LeftRailShell nav={SIDEBAR_NAV.games}>
    <div className="space-y-6">
      <header>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Games</h1>
        <p className="mt-1 text-[14px] text-gray-500">
          Play, climb the leaderboards, and win titles for yourself, your house, and your batch.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Link
          href="/games/alfazy"
          className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-brand-50 to-white p-6 transition-shadow hover:shadow-md"
        >
          <span className="absolute right-4 top-4 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            Live
          </span>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
            <Type className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-heading text-lg font-bold text-gray-900">Alfazy</h2>
          <p className="mt-1 text-[13.5px] text-gray-600">
            A new 5-letter word every day. Six guesses. Daily, weekly, monthly &amp; yearly champions.
          </p>
          <div className="mt-4 flex items-center gap-1.5 text-[13px] font-semibold text-brand">
            <Trophy className="h-4 w-4" /> Play &amp; compete →
          </div>
        </Link>

        {["Tic Tac Toe", "Rock Paper Scissors", "Guess the Number", "Memory Flip", "Maze Escape", "Quick Math Duel", "Sudoku Mini"].map(
          (name) => (
            <div key={name} className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 opacity-70">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                <Gamepad2 className="h-6 w-6" />
              </div>
              <h2 className="mt-4 font-heading text-lg font-bold text-gray-500">{name}</h2>
              <p className="mt-1 text-[13.5px] text-gray-400">Coming soon.</p>
            </div>
          ),
        )}
      </div>
    </div>
    </LeftRailShell>
  );
}
