"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Delete, Target, Wind, Trophy } from "lucide-react";
import WinBurst from "@/components/games/WinBurst";
import ShareResult from "@/components/games/ShareResult";
import { buildShareText, gameShareUrl } from "@/lib/games/share";
import {
  checkGuessAction,
  submitResultAction,
  hasPlayedTodayAction,
  startGameAction,
} from "@/app/(main)/games/actions";

export interface HitAndBlowBoardProps {
  gameKey: string;
  slug: string;
  code: string;
  name: string;
  length: number; // 4
  maxGuesses: number; // 9
  puzzleNo?: number;
  archive?: boolean;
}

type Row = { digits: string; hits: number; blows: number };
const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

export default function HitAndBlowBoard({
  gameKey,
  slug,
  code,
  name,
  length,
  maxGuesses,
  puzzleNo,
  archive = false,
}: HitAndBlowBoardProps) {
  const shortUrl = typeof window !== "undefined" ? gameShareUrl(window.location.origin, code) : "";
  const [rows, setRows] = useState<Row[]>([]);
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState<"loading" | "playing" | "won" | "lost" | "done">("loading");
  const [result, setResult] = useState<{ score: number; guessesUsed: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const resultHref = archive ? `/games/${slug}/archive` : `/games/${slug}/results`;

  useEffect(() => {
    if (!archive) startGameAction(gameKey).catch(() => {});
    hasPlayedTodayAction(gameKey, puzzleNo)
      .then((played) => setStatus(played ? "done" : "playing"))
      .catch(() => setStatus("playing"));
  }, [gameKey, puzzleNo, archive]);

  const finish = useCallback(
    async (allGuesses: string[], won: boolean) => {
      setBusy(true);
      try {
        const r = await submitResultAction(gameKey, allGuesses, puzzleNo);
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
    [gameKey, puzzleNo],
  );

  const submit = useCallback(async () => {
    if (busy || status !== "playing" || current.length !== length) return;
    setBusy(true);
    setError(null);
    try {
      const { valid, result: graded } = await checkGuessAction(gameKey, current, rows.length, puzzleNo);
      if (!valid || !graded || graded.kind !== "count") {
        setError("Not a valid code — 4 different digits, never starting with 0.");
        setShake((k) => k + 1);
        setBusy(false);
        return;
      }
      const next = [...rows, { digits: current, hits: graded.hits, blows: graded.blows }];
      setRows(next);
      setCurrent("");
      const allGuesses = next.map((r) => r.digits);
      if (graded.solved) await finish(allGuesses, true);
      else if (next.length >= maxGuesses) await finish(allGuesses, false);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }, [busy, status, current, rows, length, maxGuesses, gameKey, puzzleNo, finish]);

  const onKey = useCallback(
    (k: string) => {
      if (status !== "playing" || busy) return;
      setError(null);
      if (k === "GO") return void submit();
      if (k === "DEL") return setCurrent((c) => c.slice(0, -1));
      if (/^[0-9]$/.test(k)) setCurrent((c) => (c.length < length ? c + k : c));
    },
    [status, busy, submit, length],
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter") onKey("GO");
      else if (e.key === "Backspace") onKey("DEL");
      else if (/^[0-9]$/.test(e.key)) onKey(e.key);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onKey]);

  const gameOver = status === "won" || status === "lost";
  const triesLeft = maxGuesses - rows.length;

  return (
    <div className="mx-auto max-w-md">
      {showConfetti && <WinBurst />}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold text-brand">{name}</h1>
        <Link href={`/games/${slug}/leaderboard/individual/daily`} className="flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline">
          <Trophy className="h-4 w-4" /> Leaderboard
        </Link>
      </div>

      {status === "loading" ? (
        <div className="animate-pulse space-y-2">
          <div className="h-14 rounded-[5px] bg-gray-100" />
          <div className="h-10 w-40 rounded-[5px] bg-gray-100" />
        </div>
      ) : status === "done" && !gameOver ? (
        <div className="rounded-[5px] border border-gray-200 bg-white p-8 text-center" style={{ animation: "fade-in-up 0.4s ease" }}>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[5px] bg-sky-50">
            <Trophy className="h-7 w-7 text-sky-500" />
          </div>
          <p className="text-lg font-bold text-gray-900">{archive ? "You've already played this puzzle" : "You've already played today"}</p>
          <p className="mt-1 text-[14px] text-gray-500">{archive ? "Pick another from the archive." : "A new code unlocks tomorrow."}</p>
          <Link href={resultHref} className="mt-4 inline-block rounded-[4px] bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105">
            {archive ? "Back to archive" : "View your result"}
          </Link>
        </div>
      ) : (
        <>
          {/* Past guesses */}
          {rows.length > 0 && (
            <div className="mb-4 space-y-1.5">
              {rows.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-[5px] border border-gray-200 bg-white px-3 py-2">
                  <span className="flex gap-1.5">
                    {r.digits.split("").map((d, j) => (
                      <span key={j} className="flex h-8 w-8 items-center justify-center rounded-[3px] bg-gray-100 text-[16px] font-bold text-gray-900">
                        {d}
                      </span>
                    ))}
                  </span>
                  <span className="flex items-center gap-3 text-[15px] font-bold">
                    <span className="flex items-center gap-1 text-emerald-600"><Target className="h-4 w-4" /> {r.hits}</span>
                    <span className="flex items-center gap-1 text-amber-500"><Wind className="h-4 w-4" /> {r.blows}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Active input + Go */}
          {!gameOver && (
            <>
              <div className={`flex items-center gap-2 ${shake ? "alfazy-shake" : ""}`} key={shake}>
                <div className="flex flex-1 justify-center gap-1.5 rounded-[5px] border-2 border-sky-300 bg-white px-3 py-2.5">
                  {Array.from({ length }).map((_, i) => {
                    const d = current[i] ?? "";
                    return (
                      <span key={i} className={`flex h-10 w-10 items-center justify-center rounded-[3px] text-2xl font-bold ${d ? "text-gray-900" : "text-gray-300"}`}>
                        {d || "•"}
                      </span>
                    );
                  })}
                </div>
                <button
                  onClick={() => onKey("GO")}
                  disabled={busy || current.length !== length}
                  className="rounded-[5px] bg-brand px-6 py-3 text-sm font-bold text-white transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                >
                  Go
                </button>
              </div>
              <p className="mt-2 text-center text-[13px] text-gray-500">
                {error ? <span className="font-semibold text-rose-600" role="alert">{error}</span> : `Tries left: ${triesLeft}`}
              </p>

              {/* Digit keypad */}
              <div className="mt-5 grid grid-cols-5 gap-1.5">
                {DIGITS.map((d) => (
                  <button
                    key={d}
                    onClick={() => onKey(d)}
                    disabled={busy}
                    className="flex h-12 items-center justify-center rounded-[3px] bg-gray-100 text-[16px] font-bold text-gray-800 transition-all hover:bg-gray-200 active:scale-95 disabled:opacity-60"
                  >
                    {d}
                  </button>
                ))}
                <button
                  onClick={() => onKey("DEL")}
                  disabled={busy}
                  aria-label="Delete"
                  className="col-span-5 mt-1 flex h-11 items-center justify-center gap-1.5 rounded-[3px] bg-gray-100 text-[13px] font-bold text-gray-700 transition-all hover:bg-gray-200 active:scale-95 disabled:opacity-60"
                >
                  <Delete className="h-4 w-4" /> Delete
                </button>
              </div>
            </>
          )}

          {/* Result banner */}
          {gameOver && result && (
            <div className={`mt-2 rounded-[5px] p-5 text-center ${status === "won" ? "bg-emerald-50" : "bg-gray-50"}`} style={{ animation: "fade-in-up 0.5s ease 0.3s both" }}>
              <p className="text-lg font-bold text-gray-900">
                {status === "won" ? `Cracked in ${result.guessesUsed}/${maxGuesses}! 🎉` : "Out of tries — try tomorrow"}
              </p>
              <p className="mt-1 text-[14px] text-gray-600">You scored <span className="font-bold">{result.score}</span> points.</p>
              <div className="mx-auto mt-4 max-w-xs">
                <ShareResult
                  gameKey={gameKey}
                  text={buildShareText({
                    name,
                    puzzleNo: puzzleNo ?? 0,
                    solved: status === "won",
                    guesses: status === "won" ? result.guessesUsed : null,
                    maxGuesses,
                    score: result.score,
                    url: shortUrl,
                    grid: rows.map((r) => `🎯${r.hits} 💨${r.blows}`).join("\n"),
                  })}
                  url={shortUrl}
                  className="bg-brand text-white hover:bg-brand-700"
                  image={{
                    gameName: name,
                    puzzleNo: puzzleNo ?? 0,
                    solved: status === "won",
                    guesses: status === "won" ? result.guessesUsed : null,
                    maxGuesses,
                    score: result.score,
                    streak: 0,
                    grid: rows.map((r) => `🎯${r.hits} 💨${r.blows}`).join("\n"),
                  }}
                />
                <Link href={resultHref} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline">
                  <Trophy className="h-4 w-4" /> {archive ? "Back to archive" : "See full results"}
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
