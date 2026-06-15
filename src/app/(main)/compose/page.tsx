"use client"

import { useState } from "react"
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
  Video,
  Trash2,
} from "lucide-react"
import { createPostAction } from "./actions"

const R_CARD = "rounded-[6px]"
const R_EL = "rounded-[4px]"
const CHAR_LIMIT = 600

// Tumblr-inspired post types, each with its own colour
type PostType = "text" | "photo" | "quote" | "link" | "poll" | "question"
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
// Map composer post types to the createPost format union (text | image | link | quote).
const FORMAT_FOR_TYPE: Record<PostType, string> = {
  text: "text",
  photo: "image",
  quote: "quote",
  link: "link",
  poll: "text",
  question: "text",
}
const AUDIENCES = [
  { key: "public", label: "Public", icon: Globe, sub: "Anyone on The Parliament" },
  { key: "connections", label: "Connections", icon: Users, sub: "Only people you're connected with" },
  { key: "groups", label: "My Groups", icon: UsersRound, sub: "Members of the groups you're in" },
  { key: "anonymous", label: "Anonymous", icon: VenetianMask, sub: "Name shown cryptically · photo hidden" },
]

export default function ComposePage() {
  const [type, setType] = useState<PostType>("text")
  const [text, setText] = useState("")
  const [bg, setBg] = useState<string>("plain")
  const [audience, setAudience] = useState(AUDIENCES[0])
  const [audOpen, setAudOpen] = useState(false)
  const [category, setCategory] = useState<string | null>(null)
  const [pollOptions, setPollOptions] = useState(["", ""])
  const [linkUrl, setLinkUrl] = useState("")
  const [quoteSource, setQuoteSource] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const active = POST_TYPES.find((t) => t.key === type)!
  const activeBg = BG_OPTIONS.find((b) => b.id === bg)!
  const coloured = type === "text" && !activeBg.plain
  const remaining = CHAR_LIMIT - text.length
  const pct = Math.min(100, (text.length / CHAR_LIMIT) * 100)
  const near = remaining <= 80
  const canPost = text.trim().length > 0 || type === "photo" || type === "poll"

  const handlePost = async () => {
    if (!canPost || submitting) return
    setSubmitting(true)
    try {
      await createPostAction({
        body: text.trim(),
        categoryKey: category ? CATEGORY_KEYS[category] ?? "career_update" : "career_update",
        format: FORMAT_FOR_TYPE[type],
      })
      // createPostAction redirects to /feed on success.
    } catch (err) {
      console.error("Failed to create post", err)
      setSubmitting(false)
    }
  }

  const anon = audience.key === "anonymous"
  const authorName = anon ? "Anonymous JNVian" : "Shubham Datarkar"

  const placeholder =
    type === "question" ? "Ask your batch a question…" :
    type === "quote" ? "Share a quote that stuck with you…" :
    type === "link" ? "Say something about this link… (optional)" :
    type === "poll" ? "Ask a poll question…" :
    `What's on your mind${anon ? "" : ", Shubham"}?`

  return (
    <div className="min-h-screen bg-[#eef0f4] px-4 py-8 font-body">
      <div className="mx-auto max-w-[640px]">

        {/* Title */}
        <div className="mb-4 flex items-center gap-2">
          <span className="h-[22px] w-[6px] rounded bg-brand" />
          <h1 className="font-heading text-xl font-extrabold text-gray-900">Create a post</h1>
        </div>

        <div className={`${R_CARD} border border-gray-200/80 bg-white soft-shadow`}>

          {/* ===== Author + audience ===== */}
          <div className="flex items-center gap-3 px-5 pt-5">
            {anon ? (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-200 text-gray-500 ring-2 ring-gray-300" title="Photo hidden">
                <VenetianMask className="h-5 w-5" />
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="https://i.pravatar.cc/80?img=68" alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-brand/60" />
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

          {/* ===== Post-type switcher (Tumblr) — icon-only, mobile style ===== */}
          <div className="flex gap-2 px-5 pt-4">
            {POST_TYPES.map((t) => {
              const Icon = t.icon
              const on = t.key === type
              return (
                <button
                  key={t.key}
                  onClick={() => setType(t.key)}
                  title={t.label}
                  aria-label={t.label}
                  className={`flex h-11 flex-1 items-center justify-center ${R_EL} border transition-all`}
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
                  ? "min-h-[180px] rounded-[6px] p-6 text-center text-xl font-bold text-white placeholder:text-white/70"
                  : type === "quote"
                  ? "min-h-[120px] text-lg italic leading-relaxed text-gray-800"
                  : "min-h-[120px] text-[15px] leading-relaxed text-gray-800"
              }`}
              style={coloured ? { background: activeBg.bg, color: activeBg.fg } : undefined}
            />

            {/* Text background swatches (Facebook) */}
            {type === "text" && (
              <div className="mt-2 flex items-center gap-2">
                {BG_OPTIONS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBg(b.id)}
                    className={`h-8 w-8 shrink-0 rounded-[6px] border transition-transform hover:scale-105 ${bg === b.id ? "ring-2 ring-brand ring-offset-1" : "border-gray-200"}`}
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

            {/* Photo dropzone */}
            {type === "photo" && (
              <div className={`mt-2 flex flex-col items-center justify-center gap-2 ${R_EL} border-2 border-dashed border-gray-300 bg-gray-50 py-10 text-center transition-colors hover:border-brand hover:bg-brand-50/40`}>
                <div className="flex gap-2 text-gray-400"><ImagePlus className="h-7 w-7" /><Video className="h-7 w-7" /></div>
                <div className="text-sm font-semibold text-gray-700">Add photos / videos</div>
                <div className="text-xs text-gray-400">or drag and drop</div>
              </div>
            )}

            {/* Poll */}
            {type === "poll" && (
              <div className="mt-3 space-y-2">
                {pollOptions.map((opt, i) => (
                  <div key={i} className={`flex items-center gap-2 ${R_EL} border border-gray-200 px-3 focus-within:border-brand`}>
                    <span className="text-xs font-bold text-gray-400">{i + 1}</span>
                    <input
                      value={opt}
                      onChange={(e) => setPollOptions((o) => o.map((v, j) => (j === i ? e.target.value : v)))}
                      placeholder={`Option ${i + 1}`}
                      className="w-full bg-transparent py-2.5 text-sm text-gray-700 outline-none"
                    />
                    {pollOptions.length > 2 && (
                      <button onClick={() => setPollOptions((o) => o.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 6 && (
                  <button onClick={() => setPollOptions((o) => [...o, ""])} className={`flex items-center gap-1.5 ${R_EL} px-2 py-1.5 text-xs font-semibold text-brand hover:bg-brand-50`}>
                    <Plus className="h-3.5 w-3.5" /> Add option
                  </button>
                )}
              </div>
            )}

            {/* Category chips */}
            <div className="mt-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400"><Hash className="h-3 w-3" /> Topic</div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(category === c ? null : c)}
                    className={`${R_EL} px-2.5 py-1 text-xs font-medium transition-colors ${category === c ? "bg-brand text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
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
              <button className={`${R_EL} px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100`}>Save draft</button>
              <button
                onClick={handlePost}
                disabled={!canPost || submitting}
                className={`flex items-center gap-2 ${R_EL} px-5 py-2.5 text-sm font-bold text-white transition-colors ${canPost && !submitting ? "bg-brand hover:bg-brand-600" : "cursor-not-allowed bg-gray-300"}`}
              >
                <Send className="h-4 w-4" /> {submitting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-gray-400">
          Posting as <b className="text-gray-500">{active.label}</b> · earns you karma when people engage 💫
        </p>
      </div>
    </div>
  )
}
