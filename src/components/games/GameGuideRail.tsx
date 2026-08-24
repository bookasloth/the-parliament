"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle, Gamepad2, Target, Wind, Type, Binary, Sigma, ChevronRight, type LucideIcon } from "lucide-react";
import { DAILY_GAMES, gameBySlug, type GameKey } from "@/config/games";
import { GAME_GUIDES, type TileState } from "@/config/game-guides";
import { getBoardTheme } from "@/config/game-themes";

const ICONS: Partial<Record<GameKey, LucideIcon>> = { alfazy: Type, hit_and_blow: Binary, integra: Sigma };

/** Small coloured cell used in the worked example + legend. */
function Cell({ char, state, gameKey }: { char?: string; state: TileState; gameKey: GameKey }) {
  const theme = getBoardTheme(gameKey);
  const cls = state === "correct" ? theme.correct : state === "present" ? theme.present : theme.absent;
  return (
    <span className={`flex h-8 w-8 items-center justify-center rounded-[3px] border-2 text-[15px] font-bold uppercase ${cls}`}>
      {char}
    </span>
  );
}

export default function GameGuideRail() {
  const pathname = usePathname() ?? "";
  const slug = pathname.split("/")[2] ?? ""; // /games/<slug>/...
  const cfg = gameBySlug(slug);
  if (!cfg || cfg.status !== "live") return null; // only on a live game's pages

  const guide = GAME_GUIDES[cfg.key];
  if (!guide) return null; // no guide content for this game (e.g. a multiplayer game)
  const others = DAILY_GAMES.filter((g) => g.key !== cfg.key);

  return (
    <div className="space-y-4">
      {/* How to play */}
      <section className="rounded-[5px] border border-gray-200 bg-white p-4">
        <h2 className="flex items-center gap-2 font-heading text-[15px] font-bold text-gray-900">
          <HelpCircle className="h-4.5 w-4.5 text-brand" /> How to play
        </h2>

        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Example</p>
        {guide.example.kind === "tiles" ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {guide.example.cells.map((c, i) => (
              <Cell key={i} char={c.char} state={c.state} gameKey={cfg.key} />
            ))}
          </div>
        ) : (
          <div className="mt-1.5 flex items-center gap-3">
            <div className="flex gap-1">
              {guide.example.guess.split("").map((d, i) => (
                <span key={i} className="flex h-8 w-8 items-center justify-center rounded-[3px] border-2 border-gray-300 text-[15px] font-bold text-gray-900">
                  {d}
                </span>
              ))}
            </div>
            <span className="flex items-center gap-2 text-[13px] font-bold">
              <span className="flex items-center gap-1 text-emerald-600"><Target className="h-4 w-4" /> {guide.example.hits}</span>
              <span className="flex items-center gap-1 text-amber-500"><Wind className="h-4 w-4" /> {guide.example.blows}</span>
            </span>
          </div>
        )}
        <p className="mt-2 text-[12.5px] leading-relaxed text-gray-600">{guide.example.note}</p>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {guide.example.kind === "count" ? "Feedback" : "Tile colours"}
        </p>
        <ul className="mt-1.5 space-y-1.5">
          {guide.legend.map((l, i) => (
            <li key={i} className="flex items-center gap-2 text-[12.5px] text-gray-700">
              {l.swatch === "hit" ? (
                <Target className="h-4 w-4 flex-shrink-0 text-emerald-600" />
              ) : l.swatch === "blow" ? (
                <Wind className="h-4 w-4 flex-shrink-0 text-amber-500" />
              ) : (
                <span className={`h-4 w-4 flex-shrink-0 rounded-[2px] border-2 ${l.swatch === "correct" ? getBoardTheme(cfg.key).correct : l.swatch === "present" ? getBoardTheme(cfg.key).present : getBoardTheme(cfg.key).absent}`} />
              )}
              {l.label}
            </li>
          ))}
        </ul>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Rules</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[12.5px] text-gray-600">
          {guide.rules.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </section>

      {/* Other games */}
      {others.length > 0 && (
        <section className="rounded-[5px] border border-gray-200 bg-white p-4">
          <h2 className="flex items-center gap-2 font-heading text-[15px] font-bold text-gray-900">
            <Gamepad2 className="h-4.5 w-4.5 text-brand" /> Other games
          </h2>
          <div className="mt-3 space-y-2">
            {others.map((g) => {
              const Icon = ICONS[g.key] ?? Gamepad2;
              return (
                <Link
                  key={g.key}
                  href={`/games/${g.slug}`}
                  className="flex items-center gap-3 rounded-[5px] border border-gray-200 p-2.5 transition-colors hover:border-brand hover:bg-brand-50"
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[4px] bg-brand text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-bold text-gray-900">{g.name}</span>
                    <span className="block truncate text-[12px] text-gray-500">{g.tag}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" />
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
