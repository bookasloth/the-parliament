"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Delete, CornerDownLeft, Trophy, Target, Wind } from "lucide-react";
import Confetti from "@/components/games/Confetti";
import {
  checkGuessAction,
  submitResultAction,
  hasPlayedTodayAction,
  startGameAction,
} from "@/app/(main)/games/actions";
import type { GuessResult, Tile } from "@/modules/games/engines";
import type { BoardTheme } from "@/config/game-themes";

export type { BoardTheme };

export interface KeyDef {
  key: string;
  label?: string;
  wide?: boolean;
}

export interface GameBoardProps {
  gameKey: string;
  slug: string;
  name: string;
  length: number;
  maxGuesses: number;
  render: "tiles" | "count";
  keyboard: KeyDef[][];
  theme: BoardTheme;
  tileLabels?: { correct: string; present: string; absent: string };
}

type GradedRow = { chars: string[]; result: GuessResult };
const RANK: Record<Tile, number> = { correct: 3, present: 2, absent: 1 };

export default function GameBoard({
  gameKey,
  slug,
  name,
  length,
  maxGuesses,
  render,
  keyboard,
  theme,
  tileLabels = { correct: "correct", present: "wrong spot", absent: "not present" },
}: GameBoardProps) {
  const [rows, setRows] = useState<GradedRow[]>([]);
  const [current, setCurrent] = useState("");
  const [keyState, setKeyState] = useState<Record<string, Tile>>({});
  const [status, setStatus] = useState<"loading" | "playing" | "won" | "lost" | "done">("loading");
  const [result, setResult] = useState<{ score: number; guessesUsed: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const inputChars = useMemo(
    () => new Set(keyboard.flat().map((k) => k.key).filter((k) => k.length === 1)),
    [keyboard],
  );

  useEffect(() => {
    startGameAction(gameKey).catch(() => {});
    hasPlayedTodayAction(gameKey)
      .then((played) => setStatus(played ? "done" : "playing"))
      .catch(() => setStatus("playing"));
  }, [gameKey]);

  const tileClass = (t: Tile | "empty" | "filled"): string => {
    switch (t) {
      case "correct":
        return theme.correct;
      case "present":
        return theme.present;
      case "absent":
        return theme.absent;
      case "filled":
        return theme.filled;
      default:
        return theme.empty;
    }
  };
  const keyClass = (state: Tile | undefined): string =>
    state === "correct" ? theme.keyCorrect : state === "present" ? theme.keyPresent : state === "absent" ? theme.keyAbsent : theme.keyIdle;

  const finish = useCallback(
    async (allGuesses: string[], won: boolean) => {
      setBusy(true);
      try {
        const r = await submitResultAction(gameKey, allGuesses);
        setResult({ score: r.score, guessesUsed: r.guessesUsed });
        setStatus(won ? "won" : "lost");
        if (won) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 4000);
        }
      } catch {
        setError("Could not save your game. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [gameKey],
  );

  const submitGuess = useCallback(async () => {
    if (busy || status !== "playing" || current.length !== length) return;
    setBusy(true);
    setError(null);
    try {
      const { valid, result: graded } = await checkGuessAction(gameKey, current, rows.length);
      if (!valid || !graded) {
        setError("Not a valid guess");
        setShakeKey((k) => k + 1);
        setBusy(false);
        return;
      }
      const chars = current.split("");
      const nextRows = [...rows, { chars, result: graded }];
      setRows(nextRows);
      if (graded.kind === "tiles") {
        const tiles = graded.tiles;
        setKeyState((prev) => {
          const next = { ...prev };
          chars.forEach((c, i) => {
            const t = tiles[i];
            if (!next[c] || RANK[t] > RANK[next[c]]) next[c] = t;
          });
          return next;
        });
      }
      setCurrent("");
      const allGuesses = nextRows.map((r) => r.chars.join(""));
      if (graded.solved) await finish(allGuesses, true);
      else if (nextRows.length >= maxGuesses) await finish(allGuesses, false);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }, [busy, status, current, rows, finish, gameKey, length, maxGuesses]);

  const onKey = useCallback(
    (k: string) => {
      if (status !== "playing" || busy) return;
      setError(null);
      if (k === "ENTER") return void submitGuess();
      if (k === "DEL") return setCurrent((c) => c.slice(0, -1));
      if (inputChars.has(k)) setCurrent((c) => (c.length < length ? c + k : c));
    },
    [status, busy, submitGuess, inputChars, length],
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter") onKey("ENTER");
      else if (e.key === "Backspace") onKey("DEL");
      else {
        const up = e.key.length === 1 ? e.key.toUpperCase() : e.key;
        if (inputChars.has(up)) onKey(up);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onKey, inputChars]);

  const gameOver = status === "won" || status === "lost";
  const solvedRow = status === "won" ? rows.length - 1 : -1;

  return (
    <div className="mx-auto max-w-2xl">
      {showConfetti && <Confetti />}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold text-brand">{name}</h1>
        <Link
          href={`/games/${slug}/leaderboard/individual/daily`}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline"
        >
          <Trophy className="h-4 w-4" /> Leaderboard
        </Link>
      </div>

      {status === "loading" ? (
        <BoardSkeleton rows={maxGuesses} cols={length} />
      ) : status === "done" && !gameOver ? (
        <div className="rounded-[5px] border border-gray-200 bg-white p-8 text-center" style={{ animation: "fade-in-up 0.4s ease" }}>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[5px] bg-emerald-50">
            <Trophy className="h-7 w-7 text-emerald-500" />
          </div>
          <p className="text-lg font-bold text-gray-900">You&apos;ve already played today</p>
          <p className="mt-1 text-[14px] text-gray-500">A new puzzle unlocks tomorrow. See how you did:</p>
          <Link href={`/games/${slug}/results`} className="mt-4 inline-block rounded-[4px] bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105">
            View your result
          </Link>
        </div>
      ) : (
        <>
          <div className="mx-auto grid w-fit gap-1.5" role="grid" aria-label={`${name} guesses`}>
            {Array.from({ length: maxGuesses }).map((_, r) => {
              const graded = rows[r];
              const isActive = r === rows.length && !gameOver;
              const shake = isActive && shakeKey > 0;
              const isCount = graded && graded.result.kind === "count";
              return (
                <div key={shake ? `${r}-shake-${shakeKey}` : r} role="row" className={`flex items-center gap-1.5 ${shake ? "alfazy-shake" : ""}`}>
                  {Array.from({ length }).map((_, c) => {
                    const ch = graded ? graded.chars[c] : r === rows.length ? current[c] ?? "" : "";
                    const tileState: Tile | "empty" | "filled" =
                      graded && graded.result.kind === "tiles" ? graded.result.tiles[c] : ch ? "filled" : "empty";
                    const anim = graded && graded.result.kind === "tiles" ? "alfazy-flip" : "";
                    const bounce = r === solvedRow ? "alfazy-bounce" : "";
                    const label =
                      graded && graded.result.kind === "tiles" ? `${ch}, ${tileLabels[graded.result.tiles[c]]}` : ch ? ch : "empty";
                    return (
                      <div
                        key={graded ? c : `${c}-${ch}`}
                        role="gridcell"
                        aria-label={label}
                        className={`flex h-14 w-14 items-center justify-center rounded-[3px] border-2 text-2xl font-bold uppercase transition-colors ${tileClass(tileState)} ${anim} ${bounce} ${!graded && ch ? "alfazy-pop" : ""}`}
                        style={{ animationDelay: graded && graded.result.kind === "tiles" ? `${c * 0.22}s` : bounce ? `${c * 0.08}s` : undefined }}
                      >
                        {ch}
                      </div>
                    );
                  })}
                  {isCount && graded.result.kind === "count" && (
                    <div className="ml-2 flex items-center gap-2 text-[15px] font-bold" aria-label={`${graded.result.hits} hits, ${graded.result.blows} blows`}>
                      <span className="flex items-center gap-1 text-emerald-600">
                        <Target className="h-4 w-4" /> {graded.result.hits}
                      </span>
                      <span className="flex items-center gap-1 text-amber-500">
                        <Wind className="h-4 w-4" /> {graded.result.blows}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {render === "count" && !gameOver && (
            <p className="mt-3 text-center text-[12px] text-gray-500">
              <Target className="mr-1 inline h-3.5 w-3.5 text-emerald-600" /> right digit &amp; spot ·{" "}
              <Wind className="mr-1 inline h-3.5 w-3.5 text-amber-500" /> right digit, wrong spot
            </p>
          )}

          {error && (
            <p className="mt-3 text-center text-[13px] font-semibold text-rose-600" role="alert">
              {error}
            </p>
          )}

          {gameOver && result && (
            <div className={`mt-5 rounded-[5px] p-5 text-center ${status === "won" ? "bg-emerald-50" : "bg-gray-50"}`} style={{ animation: "fade-in-up 0.5s ease 0.3s both" }}>
              <p className="text-lg font-bold text-gray-900">
                {status === "won" ? `Solved in ${result.guessesUsed}/${maxGuesses}! 🎉` : "Better luck tomorrow"}
              </p>
              <p className="mt-1 text-[14px] text-gray-600">
                You scored <span className="font-bold">{result.score}</span> points.
              </p>
              <Link href={`/games/${slug}/results`} className="mt-3 inline-flex items-center gap-1.5 rounded-[4px] bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105">
                <Trophy className="h-4 w-4" /> See full results
              </Link>
            </div>
          )}

          {!gameOver && (
            <div className="mt-6 flex flex-col items-center gap-1.5">
              {keyboard.map((row, i) => (
                <div key={i} className="flex gap-1.5">
                  {row.map((k) => (
                    <button
                      key={k.key}
                      onClick={() => onKey(k.key)}
                      disabled={busy}
                      aria-label={k.key === "DEL" ? "Delete" : k.key === "ENTER" ? "Enter" : k.label ?? k.key}
                      className={`flex h-12 items-center justify-center rounded-[3px] text-[13px] font-bold uppercase transition-all disabled:opacity-60 ${k.wide ? "w-14 px-2" : "w-9"} ${keyClass(keyState[k.key])}`}
                    >
                      {k.key === "DEL" ? <Delete className="h-4 w-4" /> : k.key === "ENTER" ? <CornerDownLeft className="h-4 w-4" /> : k.label ?? k.key}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BoardSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <div className="animate-pulse">
      <div className="mx-auto grid w-fit gap-1.5">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-1.5">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-14 w-14 rounded-[3px] bg-gray-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
