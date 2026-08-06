"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Delete, CornerDownLeft, Trophy } from "lucide-react";
import { checkGuessAction, submitResultAction, hasPlayedTodayAction } from "../actions";
import Confetti from "@/components/games/Confetti";
import type { Tile } from "@/modules/games/alfazy";

const ROWS = 6;
const COLS = 5;
const KEYS = ["QWERTYUIOP".split(""), "ASDFGHJKL".split(""), ["ENTER", ..."ZXCVBNM".split(""), "DEL"]];

type GradedRow = { letters: string[]; tiles: Tile[] };

function tileClass(t: Tile | "empty" | "filled"): string {
  switch (t) {
    case "correct":
      return "bg-emerald-500 border-emerald-500 text-white";
    case "present":
      return "bg-amber-400 border-amber-400 text-white";
    case "absent":
      return "bg-gray-400 border-gray-400 text-white";
    case "filled":
      return "border-gray-400 text-gray-900";
    default:
      return "border-gray-200 text-gray-900";
  }
}

function keyClass(state: Tile | undefined): string {
  if (state === "correct") return "bg-emerald-500 text-white";
  if (state === "present") return "bg-amber-400 text-white";
  if (state === "absent") return "bg-gray-300 text-gray-500";
  return "bg-gray-100 text-gray-800 hover:bg-gray-200 active:scale-95";
}

const RANK: Record<Tile, number> = { correct: 3, present: 2, absent: 1 };
const TILE_LABEL: Record<Tile, string> = { correct: "correct", present: "wrong spot", absent: "not in word" };

export default function AlfazyPlayPage() {
  const [rows, setRows] = useState<GradedRow[]>([]);
  const [current, setCurrent] = useState("");
  const [keyState, setKeyState] = useState<Record<string, Tile>>({});
  const [status, setStatus] = useState<"loading" | "playing" | "won" | "lost" | "done">("loading");
  const [result, setResult] = useState<{ score: number; guessesUsed: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0); // bump to retrigger shake
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    hasPlayedTodayAction()
      .then((played) => setStatus(played ? "done" : "playing"))
      .catch(() => setStatus("playing"));
  }, []);

  const finish = useCallback(async (allGuesses: string[], won: boolean) => {
    setBusy(true);
    try {
      const r = await submitResultAction(allGuesses);
      setResult({ score: r.score, guessesUsed: r.guessesUsed });
      setStatus(won ? "won" : "lost");
      if (won) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    } catch {
      setError("Could not save your game. Try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  const submitGuess = useCallback(async () => {
    if (busy || status !== "playing" || current.length !== COLS) return;
    setBusy(true);
    setError(null);
    try {
      const { valid, tiles, solved } = await checkGuessAction(current);
      if (!valid) {
        setError("Not in word list");
        setShakeKey((k) => k + 1);
        setBusy(false);
        return;
      }
      const letters = current.split("");
      const nextRows = [...rows, { letters, tiles }];
      setRows(nextRows);
      setKeyState((prev) => {
        const next = { ...prev };
        letters.forEach((l, i) => {
          const t = tiles[i];
          if (!next[l] || RANK[t] > RANK[next[l]]) next[l] = t;
        });
        return next;
      });
      setCurrent("");
      const allGuesses = nextRows.map((r) => r.letters.join(""));
      if (solved) await finish(allGuesses, true);
      else if (nextRows.length >= ROWS) await finish(allGuesses, false);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }, [busy, status, current, rows, finish]);

  const onKey = useCallback(
    (k: string) => {
      if (status !== "playing" || busy) return;
      setError(null);
      if (k === "ENTER") return void submitGuess();
      if (k === "DEL") return setCurrent((c) => c.slice(0, -1));
      if (/^[A-Z]$/.test(k)) setCurrent((c) => (c.length < COLS ? c + k : c));
    },
    [status, busy, submitGuess],
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter") onKey("ENTER");
      else if (e.key === "Backspace") onKey("DEL");
      else if (/^[a-zA-Z]$/.test(e.key)) onKey(e.key.toUpperCase());
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onKey]);

  const gameOver = status === "won" || status === "lost";
  const solvedRow = status === "won" ? rows.length - 1 : -1;

  return (
    <div className="mx-auto max-w-2xl">
      {showConfetti && <Confetti />}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold text-brand">Alfazy</h1>
        <Link href="/games/alfazy/leaderboard/individual/daily" className="flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline">
          <Trophy className="h-4 w-4" /> Leaderboard
        </Link>
      </div>

      {status === "loading" ? (
        <BoardSkeleton />
      ) : status === "done" && !gameOver ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center" style={{ animation: "fade-in-up 0.4s ease" }}>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
            <Trophy className="h-7 w-7 text-emerald-500" />
          </div>
          <p className="text-lg font-bold text-gray-900">You&apos;ve already played today</p>
          <p className="mt-1 text-[14px] text-gray-500">A new word unlocks tomorrow. See where you stand:</p>
          <Link href="/games/alfazy/leaderboard/individual/daily" className="mt-4 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105">
            View Leaderboard
          </Link>
        </div>
      ) : (
        <>
          {/* Board */}
          <div className="mx-auto grid w-fit gap-1.5" role="grid" aria-label="Alfazy guesses">
            {Array.from({ length: ROWS }).map((_, r) => {
              const graded = rows[r];
              const isActive = r === rows.length && !gameOver;
              const shake = isActive && shakeKey > 0;
              return (
                <div
                  key={shake ? `${r}-shake-${shakeKey}` : r}
                  role="row"
                  className={`flex gap-1.5 ${shake ? "alfazy-shake" : ""}`}
                >
                  {Array.from({ length: COLS }).map((_, c) => {
                    const letter = graded ? graded.letters[c] : r === rows.length ? current[c] ?? "" : "";
                    const state: Tile | "empty" | "filled" = graded ? graded.tiles[c] : letter ? "filled" : "empty";
                    const anim = graded
                      ? "alfazy-flip"
                      : "";
                    const bounce = r === solvedRow ? "alfazy-bounce" : "";
                    const label = graded ? `${letter}, ${TILE_LABEL[graded.tiles[c]]}` : letter ? letter : "empty";
                    return (
                      <div
                        key={graded ? c : `${c}-${letter}`}
                        role="gridcell"
                        aria-label={label}
                        className={`flex h-14 w-14 items-center justify-center rounded-md border-2 text-2xl font-bold uppercase transition-colors ${tileClass(state)} ${anim} ${bounce} ${!graded && letter ? "alfazy-pop" : ""}`}
                        style={{
                          animationDelay: graded ? `${c * 0.22}s` : bounce ? `${c * 0.08}s` : undefined,
                        }}
                      >
                        {letter}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {error && (
            <p className="mt-3 text-center text-[13px] font-semibold text-rose-600" role="alert">
              {error}
            </p>
          )}

          {/* Result banner */}
          {gameOver && result && (
            <div
              className={`mt-5 rounded-2xl p-5 text-center ${status === "won" ? "bg-emerald-50" : "bg-gray-50"}`}
              style={{ animation: "fade-in-up 0.5s ease 0.3s both" }}
            >
              <p className="text-lg font-bold text-gray-900">
                {status === "won" ? `Solved in ${result.guessesUsed}/6! 🎉` : "Better luck tomorrow"}
              </p>
              <p className="mt-1 text-[14px] text-gray-600">
                You scored <span className="font-bold">{result.score}</span> points.
              </p>
              <Link
                href="/games/alfazy/leaderboard/individual/daily"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105"
              >
                <Trophy className="h-4 w-4" /> See the leaderboard
              </Link>
            </div>
          )}

          {/* Keyboard */}
          {!gameOver && (
            <div className="mt-6 flex flex-col items-center gap-1.5">
              {KEYS.map((row, i) => (
                <div key={i} className="flex gap-1.5">
                  {row.map((k) => (
                    <button
                      key={k}
                      onClick={() => onKey(k)}
                      disabled={busy}
                      aria-label={k === "DEL" ? "Delete" : k === "ENTER" ? "Enter" : k}
                      className={`flex h-12 items-center justify-center rounded-md text-[13px] font-bold uppercase transition-all disabled:opacity-60 ${
                        k === "ENTER" || k === "DEL" ? "w-14 px-2" : "w-9"
                      } ${keyClass(keyState[k])}`}
                    >
                      {k === "DEL" ? <Delete className="h-4 w-4" /> : k === "ENTER" ? <CornerDownLeft className="h-4 w-4" /> : k}
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

function BoardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mx-auto grid w-fit gap-1.5">
        {Array.from({ length: ROWS }).map((_, r) => (
          <div key={r} className="flex gap-1.5">
            {Array.from({ length: COLS }).map((_, c) => (
              <div key={c} className="h-14 w-14 rounded-md bg-gray-100" />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-col items-center gap-1.5">
        {[10, 9, 9].map((n, i) => (
          <div key={i} className="flex gap-1.5">
            {Array.from({ length: n }).map((_, k) => (
              <div key={k} className="h-12 w-9 rounded-md bg-gray-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
