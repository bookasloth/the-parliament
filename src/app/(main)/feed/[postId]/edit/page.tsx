"use client"

import { useState, useRef } from "react"
import {
  ArrowLeft, X, Image as ImageIcon, BarChart2, Quote as QuoteIcon,
  HelpCircle, Type, Globe, Users, Lock, ChevronDown, Plus, Trash2,
  Eye, Home, Calendar, Menu, Bold, Italic, Hash, AtSign, Send,
  AlertCircle, CheckCircle, Upload, GripVertical,
} from "lucide-react"

type PostType = "text" | "image" | "poll" | "quote" | "question"

const POST_TYPES: { type: PostType; icon: any; label: string; desc: string }[] = [
  { type: "text", icon: Type, label: "Text", desc: "Write a post" },
  { type: "image", icon: ImageIcon, label: "Photo / Video", desc: "Share media" },
  { type: "poll", icon: BarChart2, label: "Poll", desc: "Get opinions" },
  { type: "quote", icon: QuoteIcon, label: "Quote", desc: "Share a quote" },
  { type: "question", icon: HelpCircle, label: "Question", desc: "Ask alumni" },
]

const VISIBILITY_OPTIONS = [
  { value: "public", icon: Globe, label: "All Alumni" },
  { value: "connections", icon: Users, label: "My Connections" },
  { value: "private", icon: Lock, label: "Only Me" },
]

export default function EditPostPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [postType, setPostType] = useState<PostType>("image")
  const [content, setContent] = useState(
    "It's a reminder:\n\nOf early mornings, late nights,\nNear-falls and never-quits.\nThis isn't a photo.\nIt's proof that passion, when disciplined,\ndoesn't just play — it wins.\n\nvia @rahulsharma #Cricket #Sports"
  )
  const [visibility, setVisibility] = useState("public")
  const [showVisibility, setShowVisibility] = useState(false)
  const [pollOptions, setPollOptions] = useState(["AI / Machine Learning", "Full Stack Web Dev", "Cloud & DevOps", "Mobile Development"])
  const [pollQuestion, setPollQuestion] = useState("")
  const [quoteText, setQuoteText] = useState("")
  const [quoteAuthor, setQuoteAuthor] = useState("")
  const [quoteSource, setQuoteSource] = useState("")
  const [questionText, setQuestionText] = useState("")
  const [images] = useState([
    "https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=300&fit=crop",
  ])
  const [removedImages, setRemovedImages] = useState<number[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const MAX_CHARS = 2000
  const remaining = MAX_CHARS - content.length
  const visOption = VISIBILITY_OPTIONS.find(v => v.value === visibility)!

  function insertFormat(before: string, after = "") {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = content.slice(start, end)
    const newContent = content.slice(0, start) + before + selected + after + content.slice(end)
    setContent(newContent)
    setTimeout(() => { ta.setSelectionRange(start + before.length, start + before.length + selected.length) }, 0)
  }

  function handleSave() {
    setSaving(true)
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000) }, 1200)
  }

  return (
    <div className="min-h-screen bg-[#f3f2ef] pb-16 lg:pb-0">
      {/* Discard Dialog */}
      {showDiscardDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDiscardDialog(false)} />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Discard changes?</h3>
            <p className="text-sm text-gray-500 mb-5">Your edits will be lost. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDiscardDialog(false)} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Keep editing
              </button>
              <a href="/feed/1" className="flex-1 rounded-lg bg-red-500 py-2.5 text-sm font-semibold text-white text-center hover:bg-red-600 transition-colors">
                Discard
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Offcanvas */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-xl transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex justify-end p-3 border-b"><button onClick={() => setSidebarOpen(false)}><X className="h-5 w-5 text-gray-400" /></button></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[52px] max-w-[900px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100">
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            <button onClick={() => setShowDiscardDialog(true)} className="flex items-center gap-1.5 text-gray-500 hover:text-brand transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm font-medium hidden sm:inline">Cancel</span>
            </button>
            <span className="text-sm font-semibold text-gray-900">Edit Post</span>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors hidden sm:flex items-center gap-1.5"
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-60"
            >
              {saving ? <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {saving ? "Saving…" : "Update Post"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[900px] px-4 sm:px-6 py-6 space-y-4">
        {/* Author Row */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
            alt="" className="h-10 w-10 rounded-full object-cover border-2 border-amber-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">Shubham Datarkar</p>
            <p className="text-xs text-gray-500">Web Developer at TCS</p>
          </div>
          {/* Visibility Picker */}
          <div className="relative">
            <button
              onClick={() => setShowVisibility(!showVisibility)}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <visOption.icon className="h-3.5 w-3.5" /> {visOption.label} <ChevronDown className="h-3 w-3" />
            </button>
            {showVisibility && (
              <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                {VISIBILITY_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => { setVisibility(opt.value); setShowVisibility(false) }}
                    className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm transition-colors ${visibility === opt.value ? "text-brand bg-brand-50" : "text-gray-600 hover:bg-gray-50"}`}>
                    <opt.icon className="h-4 w-4 flex-shrink-0" /> {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Post Type Selector */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Post Type</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {POST_TYPES.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => setPostType(type)}
                className={`flex items-center gap-1.5 flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${postType === type ? "bg-brand text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Editor */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Formatting toolbar */}
          <div className="flex items-center gap-0.5 px-3 py-2 border-b border-gray-100 bg-gray-50/50">
            {[
              { icon: Bold, action: () => insertFormat("**", "**"), title: "Bold" },
              { icon: Italic, action: () => insertFormat("_", "_"), title: "Italic" },
              { icon: Hash, action: () => insertFormat("#"), title: "Hashtag" },
              { icon: AtSign, action: () => insertFormat("@"), title: "Mention" },
            ].map(({ icon: Icon, action, title }) => (
              <button key={title} onClick={action} title={title}
                className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors">
                <Icon className="h-4 w-4" />
              </button>
            ))}
            <div className="flex-1" />
            <span className={`text-[11px] font-medium tabular-nums ${remaining < 100 ? "text-red-500" : remaining < 200 ? "text-amber-500" : "text-gray-400"}`}>
              {remaining}
            </span>
          </div>

          {postType === "text" || postType === "image" ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={e => setContent(e.target.value.slice(0, MAX_CHARS))}
              placeholder="What's on your mind? Share with alumni…"
              rows={6}
              className="w-full resize-none px-4 py-4 text-sm text-gray-700 outline-none placeholder:text-gray-400 bg-transparent"
            />
          ) : postType === "poll" ? (
            <div className="px-4 py-4 space-y-3">
              <input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
                placeholder="Ask a question…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Options</p>
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-gray-300 flex-shrink-0 cursor-grab" />
                  <input value={opt} onChange={e => { const o = [...pollOptions]; o[i] = e.target.value; setPollOptions(o) }}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" />
                  <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                    disabled={pollOptions.length <= 2}
                    className="p-1.5 rounded text-gray-300 hover:text-red-400 disabled:opacity-30 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {pollOptions.length < 6 && (
                <button onClick={() => setPollOptions([...pollOptions, ""])}
                  className="flex items-center gap-1.5 text-sm text-brand hover:text-brand-600 font-medium">
                  <Plus className="h-4 w-4" /> Add Option
                </button>
              )}
              <div className="h-px bg-gray-100" />
              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder="Add a description (optional)…" rows={2}
                className="w-full resize-none text-sm text-gray-700 outline-none placeholder:text-gray-400" />
            </div>
          ) : postType === "quote" ? (
            <div className="px-4 py-4 space-y-3">
              <textarea value={quoteText} onChange={e => setQuoteText(e.target.value)}
                placeholder="Enter the quote…" rows={4}
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" />
              <input value={quoteAuthor} onChange={e => setQuoteAuthor(e.target.value)}
                placeholder="— Author name"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" />
              <input value={quoteSource} onChange={e => setQuoteSource(e.target.value)}
                placeholder="Source / Book (optional)"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" />
              <div className="h-px bg-gray-100" />
              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder="Your thoughts on this quote…" rows={2}
                className="w-full resize-none text-sm text-gray-700 outline-none placeholder:text-gray-400" />
            </div>
          ) : (
            <div className="px-4 py-4">
              <textarea value={questionText} onChange={e => setQuestionText(e.target.value)}
                placeholder="What would you like to ask your fellow alumni?" rows={3}
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" />
              <div className="h-px bg-gray-100 my-3" />
              <textarea value={content} onChange={e => setContent(e.target.value)}
                placeholder="Add context (optional)…" rows={2}
                className="w-full resize-none text-sm text-gray-700 outline-none placeholder:text-gray-400" />
            </div>
          )}
        </div>

        {/* Media Section */}
        {(postType === "image" || postType === "text") && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Photos &amp; Videos</p>
              <label className="flex items-center gap-1.5 cursor-pointer rounded-lg border border-brand px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand-50 transition-colors">
                <Upload className="h-3.5 w-3.5" /> Add More
                <input type="file" multiple accept="image/*,video/*" className="sr-only" />
              </label>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {images.map((img, i) => (
                <div key={i} className={`relative rounded-lg overflow-hidden aspect-square bg-gray-100 ${removedImages.includes(i) ? "opacity-30" : ""}`}>
                  <img src={img} alt={`Media ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setRemovedImages(r => r.includes(i) ? r.filter(x => x !== i) : [...r, i])}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                  >
                    {removedImages.includes(i)
                      ? <Plus className="h-3 w-3 rotate-45" />
                      : <X className="h-3 w-3" />}
                  </button>
                  {removedImages.includes(i) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="text-white text-xs font-medium">Removed</span>
                    </div>
                  )}
                </div>
              ))}
              <label className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 hover:border-brand hover:bg-brand-50/20 transition-colors cursor-pointer">
                <Plus className="h-5 w-5 text-gray-300" />
                <span className="text-[10px] text-gray-400 mt-1">Add</span>
                <input type="file" multiple accept="image/*,video/*" className="sr-only" />
              </label>
            </div>
            {removedImages.length > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {removedImages.length} photo{removedImages.length > 1 ? "s" : ""} marked for removal. Save to confirm.
              </p>
            )}
          </div>
        )}

        {/* Hashtag Suggestions */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Suggested Hashtags</p>
          <div className="flex flex-wrap gap-2">
            {["#JNVNagpur", "#NNAWCA", "#Alumni2013", "#Navodaya", "#Cricket", "#Sports", "#Inspiration", "#JNV"].map(tag => (
              <button key={tag}
                onClick={() => setContent(c => c.includes(tag) ? c : `${c} ${tag}`)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${content.includes(tag) ? "bg-brand text-white" : "bg-gray-100 text-gray-600 hover:bg-brand-50 hover:text-brand"}`}>
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex gap-3">
          <button onClick={() => setShowDiscardDialog(true)}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Discard Changes
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 rounded-xl bg-brand py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {saving ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : null}
            {saving ? "Saving…" : "Update Post"}
          </button>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 lg:hidden">
        <div className="flex items-center justify-around py-1.5">
          {[
            { icon: Home, label: "Home", href: "/feed" },
            { icon: Users, label: "Network", href: "/connections" },
          ].map(({ icon: Icon, label, href }) => (
            <a key={label} href={href} className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1">
              <Icon className="h-5 w-5" /><span className="text-[10px] font-medium">{label}</span>
            </a>
          ))}
          <span className="flex flex-col items-center gap-0.5 px-3 py-1 -mt-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand to-brand-700 flex items-center justify-center shadow-md">
              <Plus className="h-5 w-5 text-white" />
            </div>
          </span>
          <a href="/events" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1">
            <Calendar className="h-5 w-5" /><span className="text-[10px] font-medium">Events</span>
          </a>
          <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center gap-0.5 text-gray-400 px-3 py-1">
            <Menu className="h-5 w-5" /><span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
