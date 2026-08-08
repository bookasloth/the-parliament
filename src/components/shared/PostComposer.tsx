"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import {
  Type,
  Image as ImageIcon,
  ImagePlus,
  Quote,
  Link2,
  ListChecks,
  HelpCircle,
  Users,
  UsersRound,
  VenetianMask,
  Hash,
  Globe,
  ChevronDown,
  Plus,
  Send,
  Trash2,
} from "lucide-react"
import { UpgradePrompt } from "@/components/shared/UpgradePrompt"
import type { PlanCode } from "@/config/membership"

const R_CARD = "rounded-[5px]"
const R_EL = "rounded-[4px]"
const CHAR_LIMIT = 600

// Tumblr-inspired post types, each with its own colour
export type PostType = "text" | "photo" | "quote" | "link" | "poll" | "question"
const POST_TYPES: { key: PostType; label: string; icon: typeof Type; color: string; soft: string }[] = [
  { key: "text", label: "Text", icon: Type, color: "#009ae4", soft: "#e0f4ff" },
  { key: "photo", label: "Photo", icon: ImageIcon, color: "#2e9e5b", soft: "#e6f6ec" },
  { key: "quote", label: "Quote", icon: Quote, color: "#7a4fe0", soft: "#efe9fd" },
  { key: "link", label: "Link", icon: Link2, color: "#0aa6b8", soft: "#e0f6f8" },
  { key: "poll", label: "Poll", icon: ListChecks, color: "#d4a800", soft: "#fff7df" },
  { key: "question", label: "Question", icon: HelpCircle, color: "#e75480", soft: "#fde7ef" },
]

// Facebook-style coloured backgrounds (text mode). `fg` overrides text colour where needed.
const BG_OPTIONS: { id: string; bg: string; plain?: boolean; fg?: string }[] = [
  { id: "plain", bg: "#ffffff", plain: true },
  { id: "navy", bg: "linear-gradient(135deg,#1a3a6b,#0b1c38)" },
  { id: "brand", bg: "linear-gradient(135deg,#009ae4,#005c8c)" },
  { id: "sunset", bg: "linear-gradient(135deg,#ff8a5b,#e75480)" },
  { id: "gold", bg: "linear-gradient(135deg,#ffd119,#d4a800)" },
  { id: "forest", bg: "linear-gradient(135deg,#3ea35f,#1f6b3e)" },
  { id: "violet", bg: "linear-gradient(135deg,#9b6cff,#5a2ec0)" },
  { id: "christmas", bg: "linear-gradient(135deg,#c0392b 0%,#0e7a3a 100%)" },
  { id: "tricolour", bg: "linear-gradient(180deg,#FF9933 0%,#FF9933 33%,#ffffff 33%,#ffffff 66%,#138808 66%,#138808 100%)", fg: "#1a3a6b" },
]

const CATEGORIES = ["Career Update", "Job Opening", "Achievement", "Startup", "Seeking Help", "Mentorship", "School Memory", "Event"]
// Map the display labels above to the seeded PostCategory keys.
const CATEGORY_KEYS: Record<string, string> = {
  "Career Update": "career_update",
  "Job Opening": "job_opening",
  Achievement: "achievement",
  Startup: "startup",
  "Seeking Help": "seeking_help",
  Mentorship: "mentorship",
  "School Memory": "school_memory",
  Event: "event",
}
// Reverse: seeded key → display label (for prefilling edit mode).
const LABEL_FOR_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_KEYS).map(([label, key]) => [key, label]),
)
// Map composer post types to the createPost format.
const FORMAT_FOR_TYPE: Record<PostType, string> = {
  text: "text",
  photo: "image",
  quote: "quote",
  link: "link",
  poll: "poll",
  question: "question",
}
// Reverse: stored format → composer type (image → photo).
const TYPE_FOR_FORMAT: Record<string, PostType> = {
  text: "text",
  image: "photo",
  quote: "quote",
  link: "link",
  poll: "poll",
  question: "question",
}
const AUDIENCES = [
  { key: "public", label: "Public", icon: Globe, sub: "Anyone on NNAWCA" },
  { key: "followers", label: "Followers", icon: Users, sub: "Only people who follow you" },
  { key: "groups", label: "My Groups", icon: UsersRound, sub: "Members of the groups you're in" },
  { key: "anonymous", label: "Anonymous", icon: VenetianMask, sub: "Name shown cryptically · photo hidden" },
]

export interface ComposerMedia {
  key: string
  url: string
  type: "image" | "video"
}

export interface ComposerSubmitData {
  body: string
  categoryKey: string
  format: string
  linkUrl?: string
  media?: { key: string; type: "image" | "video" }[]
  poll?: { question: string; options: string[] }
  textBg?: string
  quoteSource?: string
  audience?: string
}

export interface PostComposerProps {
  onSubmit: (data: ComposerSubmitData) => Promise<void>
  /** Save the current draft. When provided, the "Save draft" button is active. */
  onSaveDraft?: (data: ComposerSubmitData) => Promise<void>
  /** Edit mode locks post type, category, and poll — only body/background/photos change. */
  editing?: boolean
  title?: string
  submitLabel?: string
  submittingLabel?: string
  initial?: {
    format?: string
    body?: string
    bg?: string
    categoryKey?: string
    linkUrl?: string
    quoteSource?: string
    media?: ComposerMedia[]
    poll?: { question: string; options: string[] }
  }
}

export default function PostComposer({
  onSubmit,
  onSaveDraft,
  editing = false,
  title = "Create a post",
  submitLabel = "Post",
  submittingLabel = "Posting…",
  initial,
}: PostComposerProps) {
  const initType: PostType = initial?.format
    ? TYPE_FOR_FORMAT[initial.format] ?? "text"
    : "text"
  const [type, setType] = useState<PostType>(initType)
  const [text, setText] = useState(initial?.poll?.question ?? initial?.body ?? "")
  const [bg, setBg] = useState<string>(initial?.bg ?? "plain")
  const [audience, setAudience] = useState(AUDIENCES[0])
  const [audOpen, setAudOpen] = useState(false)
  const [category, setCategory] = useState<string | null>(
    initial?.categoryKey ? LABEL_FOR_KEY[initial.categoryKey] ?? null : null,
  )
  const [pollOptions, setPollOptions] = useState<string[]>(
    initial?.poll?.options && initial.poll.options.length >= 2
      ? initial.poll.options
      : ["", ""],
  )
  const [linkUrl, setLinkUrl] = useState(initial?.linkUrl ?? "")
  const [quoteSource, setQuoteSource] = useState(initial?.quoteSource ?? "")
  const [media, setMedia] = useState<ComposerMedia[]>(initial?.media ?? [])
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadErr(null)
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) continue
        const ext = file.name.split(".").pop() || "jpg"
        const signRes = await fetch("/api/uploads/sign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind: "post", contentType: file.type, ext }),
        })
        if (!signRes.ok) throw new Error("Could not start upload")
        const { key, uploadUrl } = await signRes.json()
        const put = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "content-type": file.type },
          body: file,
        })
        if (!put.ok) throw new Error("Upload failed")
        setMedia((m) => [
          ...m,
          { key, url: URL.createObjectURL(file), type: file.type.startsWith("video/") ? "video" : "image" },
        ])
      }
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }
  // Current membership tier + whether the jobs benefit is unlocked.
  const [plan, setPlan] = useState<PlanCode>("student")
  const [jobsAllowed, setJobsAllowed] = useState(true) // optimistic; corrected on load
  useEffect(() => {
    fetch("/api/membership/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setPlan(d.planCode); setJobsAllowed(!!d.benefits?.jobs) } })
      .catch(() => {})
  }, [])
  // Real logged-in author (name + avatar) for the composer header.
  const [me, setMe] = useState<{ name: string; photoUrl: string } | null>(null)
  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setMe(d) })
      .catch(() => {})
  }, [])
  // Preselect type from ComposeTrigger deep-links (/compose?type=poll). window
  // (not useSearchParams) keeps this page out of a Suspense boundary. Edit mode
  // ignores the query — the type is fixed to the existing post.
  useEffect(() => {
    if (editing) return
    const t = new URLSearchParams(window.location.search).get("type")
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional URL→state sync, guarded to run client-side only
    if (t && POST_TYPES.some((pt) => pt.key === t)) setType(t as PostType)
  }, [editing])

  const jobGateBlocked = category === "Job Opening" && !jobsAllowed

  const active = POST_TYPES.find((t) => t.key === type)!
  const activeBg = BG_OPTIONS.find((b) => b.id === bg)!
  const coloured = type === "text" && !activeBg.plain
  const remaining = CHAR_LIMIT - text.length
  const pct = Math.min(100, (text.length / CHAR_LIMIT) * 100)
  const near = remaining <= 80
  const pollFilled = pollOptions.map((o) => o.trim()).filter(Boolean)
  const canPost =
    (type === "photo"
      ? media.length > 0
      : type === "poll"
      ? text.trim().length > 0 && pollFilled.length >= 2
      : type === "link"
      ? linkUrl.trim().length > 0
      : text.trim().length > 0) &&
    !uploading &&
    !jobGateBlocked

  const handlePost = async () => {
    if (!canPost || submitting) return
    setSubmitting(true)
    try {
      await onSubmit({
        body: text.trim(),
        categoryKey: category ? CATEGORY_KEYS[category] ?? "career_update" : "career_update",
        format: FORMAT_FOR_TYPE[type],
        linkUrl: type === "link" ? linkUrl.trim() : undefined,
        media: type === "photo" ? media.map((m) => ({ key: m.key, type: m.type })) : undefined,
        poll: type === "poll" ? { question: text.trim(), options: pollFilled } : undefined,
        textBg: type === "text" && bg !== "plain" ? bg : undefined,
        quoteSource: type === "quote" && quoteSource.trim() ? quoteSource.trim() : undefined,
        audience: audience.key,
      })
      // onSubmit redirects on success.
    } catch (err) {
      console.error("Failed to submit post", err)
      setSubmitting(false)
    }
  }

  const [savingDraft, setSavingDraft] = useState(false)
  // A draft only needs *something* — not the full per-type validity.
  const hasDraftContent =
    text.trim().length > 0 || media.length > 0 || linkUrl.trim().length > 0
  const handleSaveDraft = async () => {
    if (!onSaveDraft || savingDraft || submitting || !hasDraftContent) return
    setSavingDraft(true)
    try {
      await onSaveDraft({
        body: text.trim(),
        categoryKey: category ? CATEGORY_KEYS[category] ?? "career_update" : "career_update",
        format: FORMAT_FOR_TYPE[type],
        linkUrl: type === "link" ? linkUrl.trim() : undefined,
        media: type === "photo" ? media.map((m) => ({ key: m.key, type: m.type })) : undefined,
        poll: type === "poll" ? { question: text.trim(), options: pollFilled } : undefined,
        textBg: type === "text" && bg !== "plain" ? bg : undefined,
        quoteSource: type === "quote" && quoteSource.trim() ? quoteSource.trim() : undefined,
        audience: audience.key,
      })
      // onSaveDraft redirects to the drafts page on success.
    } catch (err) {
      console.error("Failed to save draft", err)
      setSavingDraft(false)
    }
  }

  const anon = audience.key === "anonymous"
  const authorName = anon ? "Anonymous JNVian" : me?.name ?? "You"
  const firstName = me?.name?.split(" ")[0] ?? ""

  const placeholder =
    type === "question" ? "Ask your batch a question…" :
    type === "quote" ? "Share a quote that stuck with you…" :
    type === "link" ? "Say something about this link… (optional)" :
    type === "poll" ? "Ask a poll question…" :
    `What's on your mind${anon ? "" : firstName ? `, ${firstName}` : ""}?`

  return (
    <div className="min-h-screen bg-[#eef0f4] px-4 py-8 font-body">
      <div className="mx-auto max-w-[640px]">

        {/* Title */}
        <div className="mb-4 flex items-center gap-2">
          <span className="h-[22px] w-[6px] rounded-[3px] bg-brand" />
          <h1 className="font-heading text-xl font-extrabold text-gray-900">{title}</h1>
        </div>

        <div className={`${R_CARD} border border-gray-200/80 bg-white soft-shadow`}>

          {/* ===== Author + audience ===== */}
          <div className="flex items-center gap-3 px-5 pt-5">
            {anon ? (
              <div className="flex h-11 w-11 items-center justify-center rounded-[4px] bg-gray-200 text-gray-500 ring-2 ring-gray-300" title="Photo hidden">
                <VenetianMask className="h-5 w-5" />
              </div>
            ) : (
              <Image
                src={me?.photoUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(me?.name ?? "You")}`}
                alt=""
                width={44}
                height={44}
                className="h-11 w-11 rounded-[4px] object-cover ring-2 ring-brand/60"
              />
            )}
            <div className="relative">
              <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                {anon ? <span className="tracking-[0.15em]">A•••••••n</span> : authorName}
                {anon && <span className="rounded-[4px] bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">Anonymous</span>}
              </div>
              <button
                onClick={() => setAudOpen((o) => !o)}
                className={`mt-0.5 flex items-center gap-1.5 ${R_EL} bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200`}
              >
                <audience.icon className="h-3.5 w-3.5" /> {audience.label} <ChevronDown className="h-3 w-3" />
              </button>
              {audOpen && (
                <div className={`absolute left-0 top-full z-20 mt-1 w-64 ${R_CARD} border border-gray-200 bg-white p-1.5 shadow-xl`}>
                  {AUDIENCES.map((a) => (
                    <button
                      key={a.key}
                      onClick={() => { setAudience(a); setAudOpen(false) }}
                      className={`flex w-full items-center gap-3 ${R_EL} px-2.5 py-2 text-left hover:bg-gray-50 ${audience.key === a.key ? "bg-brand-50" : ""}`}
                    >
                      <span className={`flex h-8 w-8 items-center justify-center ${R_EL} bg-gray-100 text-gray-600`}><a.icon className="h-4 w-4" /></span>
                      <span><span className="block text-[13px] font-semibold text-gray-800">{a.label}</span><span className="block text-[11px] text-gray-500">{a.sub}</span></span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ===== Post-type switcher (Tumblr) — icon-only, mobile style.
                   Locked in edit mode: the post's format can't change. ===== */}
          <div className="flex gap-2 px-5 pt-4">
            {POST_TYPES.map((t) => {
              const Icon = t.icon
              const on = t.key === type
              const locked = editing && !on
              return (
                <button
                  key={t.key}
                  onClick={() => { if (!editing) setType(t.key) }}
                  disabled={editing}
                  title={editing ? (on ? t.label : "Post type can't be changed when editing") : t.label}
                  aria-label={t.label}
                  className={`flex h-11 flex-1 items-center justify-center ${R_EL} border transition-all ${
                    editing ? "cursor-not-allowed" : ""
                  } ${locked ? "opacity-40" : ""}`}
                  style={on
                    ? { background: t.color, borderColor: t.color, color: "#fff" }
                    : { background: t.soft, borderColor: "transparent", color: t.color }}
                >
                  <Icon className="h-5 w-5" />
                </button>
              )
            })}
          </div>

          {/* ===== Composer body ===== */}
          <div className="px-5 pt-4">
            <textarea
              value={text}
              maxLength={CHAR_LIMIT}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              className={`w-full resize-none border-0 outline-none transition-all placeholder:text-gray-400 ${
                coloured
                  ? "min-h-[180px] rounded-[5px] p-6 text-center text-xl font-bold text-white placeholder:text-white/70"
                  : type === "quote"
                  ? "min-h-[120px] text-lg italic leading-relaxed text-gray-800"
                  : "min-h-[120px] text-[15px] leading-relaxed text-gray-800"
              }`}
              style={coloured ? { background: activeBg.bg, color: activeBg.fg } : undefined}
            />

            {/* Text background swatches (Facebook) — editable in both modes */}
            {type === "text" && (
              <div className="mt-2 flex items-center gap-2">
                {BG_OPTIONS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBg(b.id)}
                    className={`h-8 w-8 shrink-0 rounded-[5px] border transition-transform hover:scale-105 ${bg === b.id ? "ring-2 ring-brand ring-offset-1" : "border-gray-200"}`}
                    style={{ background: b.bg }}
                    aria-label={b.id}
                  >
                    {b.plain && <span className="text-[10px] font-bold text-gray-400">Aa</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Quote source */}
            {type === "quote" && (
              <input
                value={quoteSource}
                onChange={(e) => setQuoteSource(e.target.value)}
                placeholder="— Who said it? (optional)"
                className={`mt-2 w-full ${R_EL} border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-brand`}
              />
            )}

            {/* Link */}
            {type === "link" && (
              <div className="mt-2">
                <div className={`flex items-center gap-2 ${R_EL} border border-gray-200 px-3 focus-within:border-brand`}>
                  <Link2 className="h-4 w-4 text-gray-400" />
                  <input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="Paste a link (https://…)"
                    className="w-full bg-transparent py-2.5 text-sm text-gray-700 outline-none"
                  />
                </div>
                {linkUrl && (
                  <div className={`mt-2 flex items-center gap-3 ${R_EL} border border-gray-200 bg-gray-50 p-3`}>
                    <span className={`flex h-12 w-12 items-center justify-center ${R_EL} bg-brand-50 text-brand`}><Globe className="h-5 w-5" /></span>
                    <div className="min-w-0"><div className="truncate text-[13px] font-semibold text-gray-800">Link preview</div><div className="truncate text-xs text-gray-500">{linkUrl}</div></div>
                  </div>
                )}
              </div>
            )}

            {/* Photo dropzone — editable in both modes */}
            {type === "photo" && (
              <div className="mt-2">
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); void uploadFiles(e.dataTransfer.files) }}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 ${R_EL} border-2 border-dashed border-gray-300 bg-gray-50 py-10 text-center transition-colors hover:border-brand hover:bg-brand-50/40`}
                >
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={(e) => { void uploadFiles(e.target.files); e.target.value = "" }}
                  />
                  <div className="flex gap-2 text-gray-400"><ImagePlus className="h-7 w-7" /></div>
                  <div className="text-sm font-semibold text-gray-700">{uploading ? "Uploading…" : "Add photos / videos"}</div>
                  <div className="text-xs text-gray-400">click or drag and drop · up to 64 MB each</div>
                </label>
                {uploadErr && <p className="mt-2 text-xs text-rose-600">{uploadErr}</p>}
                {media.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {media.map((m, i) => (
                      <div key={m.key || i} className={`relative aspect-square overflow-hidden ${R_EL} border border-gray-200`}>
                        {m.type === "video" ? (
                          <video src={m.url} className="h-full w-full object-cover" muted />
                        ) : (
                          // Local blob: URL — plain <img>, next/image can't optimize blobs.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.url} alt="" className="h-full w-full object-cover" />
                        )}
                        <button
                          onClick={() => setMedia((cur) => cur.filter((_, j) => j !== i))}
                          className="absolute right-1 top-1 rounded-[3px] bg-black/60 p-1 text-white hover:bg-black/80"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Poll — read-only in edit mode (can't re-edit a poll with votes cast) */}
            {type === "poll" && (
              <div className="mt-3 space-y-2">
                {pollOptions.map((opt, i) => (
                  <div key={i} className={`flex items-center gap-2 ${R_EL} border border-gray-200 px-3 focus-within:border-brand`}>
                    <span className="text-xs font-bold text-gray-400">{i + 1}</span>
                    <input
                      value={opt}
                      readOnly={editing}
                      onChange={(e) => setPollOptions((o) => o.map((v, j) => (j === i ? e.target.value : v)))}
                      placeholder={`Option ${i + 1}`}
                      className={`w-full bg-transparent py-2.5 text-sm text-gray-700 outline-none ${editing ? "cursor-not-allowed text-gray-500" : ""}`}
                    />
                    {!editing && pollOptions.length > 2 && (
                      <button onClick={() => setPollOptions((o) => o.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                ))}
                {!editing && pollOptions.length < 6 && (
                  <button onClick={() => setPollOptions((o) => [...o, ""])} className={`flex items-center gap-1.5 ${R_EL} px-2 py-1.5 text-xs font-semibold text-brand hover:bg-brand-50`}>
                    <Plus className="h-3.5 w-3.5" /> Add option
                  </button>
                )}
              </div>
            )}

            {/* Category chips — locked in edit mode (editPost doesn't persist category) */}
            <div className="mt-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400"><Hash className="h-3 w-3" /> Topic</div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => {
                  const on = category === c
                  if (editing && !on) return null // show only the post's existing topic
                  return (
                    <button
                      key={c}
                      onClick={() => { if (!editing) setCategory(category === c ? null : c) }}
                      disabled={editing}
                      className={`${R_EL} px-2.5 py-1 text-xs font-medium transition-colors ${on ? "bg-brand text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"} ${editing ? "cursor-not-allowed" : ""}`}
                    >
                      {c}
                    </button>
                  )
                })}
              </div>
              {jobGateBlocked && (
                <div className="mt-3">
                  <UpgradePrompt currentPlan={plan} feature="Posting a job opening" />
                </div>
              )}
            </div>
          </div>

          {/* ===== Footer ===== */}
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-2">
              {/* Twitter-style char ring */}
              <svg width="30" height="30" viewBox="0 0 30 30" className="-rotate-90">
                <circle cx="15" cy="15" r="12" fill="none" stroke="#e7e9ef" strokeWidth="3" />
                <circle
                  cx="15" cy="15" r="12" fill="none"
                  stroke={near ? (remaining < 0 ? "#e11d48" : "#d4a800") : "#009ae4"}
                  strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 12}
                  strokeDashoffset={2 * Math.PI * 12 * (1 - pct / 100)}
                />
              </svg>
              <span className={`text-xs font-semibold tabular-nums ${near ? (remaining < 0 ? "text-rose-600" : "text-amber-600") : "text-gray-400"}`}>
                {near ? remaining : `${text.length}/${CHAR_LIMIT}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!editing && onSaveDraft && (
                <button
                  onClick={handleSaveDraft}
                  disabled={savingDraft || submitting || !hasDraftContent}
                  className={`${R_EL} px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent`}
                >
                  {savingDraft ? "Saving…" : "Save draft"}
                </button>
              )}
              <button
                onClick={handlePost}
                disabled={!canPost || submitting}
                className={`flex items-center gap-2 ${R_EL} px-5 py-2.5 text-sm font-bold text-white transition-colors ${canPost && !submitting ? "bg-brand hover:bg-brand-600" : "cursor-not-allowed bg-gray-300"}`}
              >
                <Send className="h-4 w-4" /> {submitting ? submittingLabel : submitLabel}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-gray-400">
          {editing ? (
            <>Editing your <b className="text-gray-500">{active.label}</b> post · changes are marked as edited ✏️</>
          ) : (
            <>Posting as <b className="text-gray-500">{active.label}</b> · earns you karma when people engage 💫</>
          )}
        </p>
      </div>
    </div>
  )
}
