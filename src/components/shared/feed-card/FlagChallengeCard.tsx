"use client"

import { useRef, useState } from "react"
import FlagCanvas, { type FlagCanvasHandle } from "./FlagCanvas"
import { scoreDrawing, GRID } from "@/modules/games/flag-scoring"
import type { FeedPost } from "./types"

type Challenge = NonNullable<FeedPost["flagChallenge"]>
export type GallerySubmission = {
  score: number
  imageUrl: string
  name: string
  username: string | null
  avatarUrl: string | null
}

export default function FlagChallengeCard({
  challenge,
  onSubmit,
  onLoadGallery,
  onComment,
}: {
  challenge: Challenge
  onSubmit?: (imageKey: string, score: number) => Promise<{ score: number }>
  onLoadGallery?: (challengeId: string) => Promise<GallerySubmission[]>
  onComment?: (timeMs?: number) => Promise<{ id: string }>
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [result, setResult] = useState<{ score: number; imageUrl: string; timeMs?: number } | null>(
    challenge.mySubmission ?? null,
  )
  const [gallery, setGallery] = useState<GallerySubmission[] | null>(null)
  const [count, setCount] = useState(challenge.submissionCount)
  const [commentState, setCommentState] = useState<"idle" | "posting" | "done">("idle")
  const handle = useRef<FlagCanvasHandle | null>(null)
  const openedAt = useRef<number | null>(null)

  function openDraw() {
    openedAt.current = Date.now()
    setOpen(true)
  }

  async function revealAndSubmit() {
    if (!handle.current || !onSubmit) return
    setBusy(true)
    setErr(null)
    try {
      const drawn = downscale(handle.current.getImageData())
      const target = downscale(await loadFlag(challenge.flagRefUrl))
      const score = scoreDrawing(drawn, target)

      const blob = await handle.current.toBlob()
      const key = await uploadDrawing(blob)
      const saved = await onSubmit(key, score)

      const timeMs = openedAt.current ? Date.now() - openedAt.current : undefined
      const localUrl = URL.createObjectURL(blob)
      if (!challenge.mySubmission) setCount((c) => c + 1)
      setResult({ score: saved.score, imageUrl: localUrl, timeMs })
      setCommentState("idle")
      setOpen(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong — try again.")
    } finally {
      setBusy(false)
    }
  }

  async function showGallery() {
    if (!onLoadGallery) return
    setGallery(await onLoadGallery(challenge.id).catch(() => []))
  }

  async function postComment() {
    if (!onComment || commentState !== "idle") return
    setCommentState("posting")
    try {
      await onComment(result?.timeMs)
      setCommentState("done")
    } catch {
      setCommentState("idle")
      setErr("Couldn't post your drawing — try again.")
    }
  }

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-brand-50 to-white">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-brand">🏴 Flag Challenge</div>
          <div className="text-lg font-bold text-gray-900">Draw the flag of {challenge.countryName}</div>
          <div className="text-xs text-gray-500">{count} {count === 1 ? "drawing" : "drawings"} so far</div>
        </div>
      </div>

      {result ? (
        <Result
          result={result}
          flagRefUrl={challenge.flagRefUrl}
          countryName={challenge.countryName}
          gallery={gallery}
          onShowGallery={onLoadGallery ? showGallery : undefined}
          onRedraw={onSubmit ? openDraw : undefined}
          onComment={onComment ? postComment : undefined}
          commentState={commentState}
        />
      ) : onSubmit ? (
        <div className="px-4 pb-4">
          <button
            onClick={openDraw}
            className="w-full rounded-lg bg-brand py-2.5 font-semibold text-white transition hover:bg-brand-700"
          >
            Draw it from memory
          </button>
        </div>
      ) : null}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Draw {challenge.countryName}</h3>
              <button onClick={() => !busy && setOpen(false)} className="text-gray-400 hover:text-gray-700" aria-label="Close">✕</button>
            </div>
            <FlagCanvas onReady={(h) => (handle.current = h)} />
            {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
            <button
              onClick={revealAndSubmit}
              disabled={busy}
              className="mt-3 w-full rounded-lg bg-brand py-2.5 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? "Scoring…" : "Reveal & compare"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Result({
  result,
  flagRefUrl,
  countryName,
  gallery,
  onShowGallery,
  onRedraw,
  onComment,
  commentState = "idle",
}: {
  result: { score: number; imageUrl: string; timeMs?: number }
  flagRefUrl: string
  countryName: string
  gallery: GallerySubmission[] | null
  onShowGallery?: () => void
  onRedraw?: () => void
  onComment?: () => void
  commentState?: "idle" | "posting" | "done"
}) {
  const great = result.score >= 90
  return (
    <div className="px-4 pb-4">
      <div className="mb-2 text-center">
        <span className={`text-3xl font-black ${great ? "text-green-600" : "text-brand"}`}>{result.score}%</span>
        <span className="ml-2 text-sm text-gray-600">match{great ? " 🎉" : ""}</span>
        {result.timeMs != null && (
          <span className="ml-2 text-xs text-gray-400">· {fmtTime(result.timeMs)}</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.imageUrl} alt="Your drawing" className="w-full rounded-lg border border-gray-200" />
          <figcaption className="mt-1 text-center text-xs text-gray-500">Your drawing</figcaption>
        </figure>
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={flagRefUrl} alt={`Flag of ${countryName}`} className="w-full rounded-lg border border-gray-200" />
          <figcaption className="mt-1 text-center text-xs text-gray-500">Real flag</figcaption>
        </figure>
      </div>
      {onComment && (
        <button
          onClick={onComment}
          disabled={commentState !== "idle"}
          className="mt-3 w-full rounded-lg bg-brand py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {commentState === "done" ? "Posted to comments ✓" : commentState === "posting" ? "Posting…" : "Comment my drawing"}
        </button>
      )}
      <div className="mt-2 flex gap-2">
        {onRedraw && (
          <button onClick={onRedraw} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Redraw
          </button>
        )}
        {onShowGallery && !gallery && (
          <button onClick={onShowGallery} className="flex-1 rounded-lg border border-brand py-2 text-sm font-medium text-brand hover:bg-brand/5">
            See everyone&apos;s drawings
          </button>
        )}
      </div>
      {gallery && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {gallery.length === 0 && <p className="col-span-3 text-center text-sm text-gray-500">No drawings yet.</p>}
          {gallery.map((g, i) => (
            <figure key={i} className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.imageUrl} alt={`${g.name}'s drawing`} className="w-full rounded-md border border-gray-200" />
              <figcaption className="mt-0.5 truncate text-[11px] text-gray-500">{g.name} · {g.score}%</figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}

function fmtTime(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r ? `${m}m ${r}s` : `${m}m`
}

// ── client helpers ────────────────────────────────────────────────────────

// Draw an ImageData/Image onto a GRID×GRID canvas (the browser averages pixels
// down for us) and read it back — the same transform for drawing and flag.
function downscale(src: ImageData | HTMLImageElement): Uint8ClampedArray {
  const small = document.createElement("canvas")
  small.width = GRID
  small.height = GRID
  const sc = small.getContext("2d")!
  if (src instanceof ImageData) {
    const full = document.createElement("canvas")
    full.width = src.width
    full.height = src.height
    full.getContext("2d")!.putImageData(src, 0, 0)
    sc.drawImage(full, 0, 0, GRID, GRID)
  } else {
    sc.drawImage(src, 0, 0, GRID, GRID)
  }
  return sc.getImageData(0, 0, GRID, GRID).data
}

function loadFlag(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous" // flagcdn serves CORS headers → canvas stays untainted
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Couldn't load the reference flag"))
    img.src = url
  })
}

async function uploadDrawing(blob: Blob): Promise<string> {
  const signRes = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "game_submission", contentType: "image/png" }),
  })
  if (!signRes.ok) throw new Error("Could not start upload")
  const { key, uploadUrl } = await signRes.json()
  const put = await fetch(uploadUrl, { method: "PUT", headers: { "content-type": "image/png" }, body: blob })
  if (!put.ok) throw new Error("Upload failed")
  return key as string
}
