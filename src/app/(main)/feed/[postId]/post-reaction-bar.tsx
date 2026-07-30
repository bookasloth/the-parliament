"use client"

import { useState, useTransition } from "react"
import {
  ThumbsUp, ThumbsDown, MessageCircle, Share2,
  Bookmark, BookmarkCheck, Award, MoreHorizontal, Copy, Flag, Trash2,
} from "lucide-react"

type ReactionType = "upvote" | "downvote" | "like"

interface Props {
  postId: string
  isAuthor?: boolean
  initialSaved?: boolean
  initial: {
    upvotes: number
    downvotes: number
    comments: number
    shares: number
    viewerReaction: ReactionType | null
  }
  reactAction: (postId: string, type: ReactionType) => Promise<{ reacted: boolean }>
  shareAction?: (postId: string) => Promise<unknown>
  saveAction?: (postId: string) => Promise<{ saved: boolean }>
  awardAction?: (postId: string, awardKey: string) => Promise<{ ok: boolean; error?: string }>
  reportAction?: (postId: string, reason: string) => Promise<unknown>
  deleteAction?: (postId: string) => Promise<unknown>
}

const AWARD_KEYS = [
  "GOAT", "FIRE", "BRAIN", "LOL", "MICDROP", "SUPPORT",
  "CLAP", "CROWN", "ANGEL", "ROCKET", "WTF", "SHITPOST",
]

export default function PostReactionBar({
  postId,
  isAuthor = false,
  initialSaved = false,
  initial,
  reactAction,
  shareAction,
  saveAction,
  awardAction,
  reportAction,
  deleteAction,
}: Props) {
  const [reaction, setReaction] = useState<ReactionType | null>(initial.viewerReaction)
  const [upvotes, setUpvotes] = useState(initial.upvotes)
  const [downvotes, setDownvotes] = useState(initial.downvotes)
  const [shares, setShares] = useState(initial.shares)
  const [saved, setSaved] = useState(initialSaved)
  const [menuOpen, setMenuOpen] = useState(false)
  const [awardOpen, setAwardOpen] = useState(false)
  const [awardErr, setAwardErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggle(type: ReactionType) {
    const wasSame = reaction === type
    const prev = reaction

    if (wasSame) {
      setReaction(null)
      if (type === "upvote" || type === "like") setUpvotes((v) => v - 1)
      if (type === "downvote") setDownvotes((v) => v - 1)
    } else {
      setReaction(type)
      if (prev === "upvote" || prev === "like") setUpvotes((v) => v - 1)
      if (prev === "downvote") setDownvotes((v) => v - 1)
      if (type === "upvote" || type === "like") setUpvotes((v) => v + 1)
      if (type === "downvote") setDownvotes((v) => v + 1)
    }

    startTransition(() => {
      reactAction(postId, type).catch(() => {
        setReaction(prev)
        setUpvotes(initial.upvotes)
        setDownvotes(initial.downvotes)
      })
    })
  }

  function doShare() {
    if (!shareAction) return
    setShares((s) => s + 1)
    startTransition(() => {
      shareAction(postId).catch(() => setShares((s) => s - 1))
    })
  }

  function doSave() {
    if (!saveAction) return
    setSaved((v) => !v)
    startTransition(() => {
      saveAction(postId)
        .then((r) => setSaved(r.saved))
        .catch(() => setSaved((v) => !v))
    })
  }

  function copyLink() {
    setMenuOpen(false)
    if (typeof window !== "undefined" && navigator?.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => {})
    }
  }

  function doReport() {
    setMenuOpen(false)
    if (!reportAction) return
    const reason = window.prompt("Why are you reporting this post?", "inappropriate")
    if (!reason) return
    startTransition(() => {
      reportAction(postId, reason).catch(() => {})
    })
  }

  function doDelete() {
    setMenuOpen(false)
    if (!deleteAction) return
    if (!window.confirm("Delete this post?")) return
    startTransition(() => {
      deleteAction(postId).catch(() => {})
    })
  }

  async function pickAward(key: string) {
    if (!awardAction) return
    setAwardErr(null)
    const r = await awardAction(postId, key)
    if (r.ok) {
      setAwardOpen(false)
    } else {
      setAwardErr(r.error || "Failed to give award")
    }
  }

  return (
    <>
      <div className="border-t border-gray-100 px-3 sm:px-5 py-1 flex items-center justify-around text-sm relative">
        <button
          onClick={() => toggle("upvote")}
          disabled={pending}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
            reaction === "upvote"
              ? "text-brand-700 bg-brand-50"
              : "text-gray-500 hover:text-brand-700 hover:bg-brand-50/50"
          }`}
        >
          <ThumbsUp className={`h-4 w-4 ${reaction === "upvote" ? "fill-brand-700" : ""}`} />
          <span className="text-xs font-medium tabular-nums">{upvotes}</span>
        </button>
        <button
          onClick={() => toggle("downvote")}
          disabled={pending}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
            reaction === "downvote"
              ? "text-red-500 bg-red-50"
              : "text-gray-500 hover:text-red-500 hover:bg-red-50/50"
          }`}
        >
          <ThumbsDown className={`h-4 w-4 ${reaction === "downvote" ? "fill-red-500" : ""}`} />
          <span className="text-xs font-medium tabular-nums">{downvotes}</span>
        </button>
        <div className="flex items-center gap-1.5 px-3 py-2 text-gray-500">
          <MessageCircle className="h-4 w-4" />
          <span className="text-xs font-medium tabular-nums">{initial.comments}</span>
        </div>
        <button
          onClick={doShare}
          disabled={pending || !shareAction}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50/50 disabled:opacity-50"
        >
          <Share2 className="h-4 w-4" />
          <span className="text-xs font-medium tabular-nums">{shares}</span>
        </button>
        <button
          onClick={doSave}
          disabled={pending || !saveAction}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 ${
            saved ? "text-brand-700 bg-brand-50" : "text-gray-500 hover:text-brand-700 hover:bg-brand-50/50"
          }`}
          title={saved ? "Saved" : "Save post"}
        >
          {saved ? <BookmarkCheck className="h-4 w-4 fill-brand-700" /> : <Bookmark className="h-4 w-4" />}
        </button>
        {!isAuthor && awardAction && (
          <button
            onClick={() => setAwardOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-500 hover:text-amber-500 hover:bg-amber-50/50"
            title="Give an award"
          >
            <Award className="h-4 w-4" />
          </button>
        )}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center px-2 py-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            title="More"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 bottom-full mb-1 z-30 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <button
                onClick={copyLink}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Copy className="h-4 w-4" /> Copy link
              </button>
              {isAuthor ? (
                <button
                  onClick={doDelete}
                  disabled={!deleteAction}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> Delete post
                </button>
              ) : (
                <button
                  onClick={doReport}
                  disabled={!reportAction}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Flag className="h-4 w-4" /> Report post
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {awardOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setAwardOpen(false)}
        >
          <div className="fixed inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-md rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h5 className="text-base font-semibold text-gray-900">Give an award</h5>
              <button
                onClick={() => setAwardOpen(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
              >
                ×
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="mb-3 text-xs text-gray-500">Spends karma from your balance.</p>
              <div className="grid grid-cols-4 gap-2">
                {AWARD_KEYS.map((k) => (
                  <button
                    key={k}
                    onClick={() => pickAward(k)}
                    className="flex flex-col items-center rounded-lg border border-gray-200 p-2.5 hover:bg-brand-50 hover:border-brand-200"
                  >
                    <span className="text-[10px] font-semibold text-gray-700">{k}</span>
                  </button>
                ))}
              </div>
              {awardErr && <p className="mt-3 text-xs text-red-500">{awardErr}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
