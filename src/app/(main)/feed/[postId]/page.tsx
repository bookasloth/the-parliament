"use client"

import { useState, useRef, useEffect } from "react"
import {
  ArrowLeft, MoreHorizontal, ThumbsUp, ThumbsDown, MessageCircle, Share2,
  Award, Bookmark, Flag, Mail, BookmarkCheck, Link as LinkIcon, PenSquare,
  ShieldCheck, Trash2, VolumeX, Copy, Edit3, Quote as QuoteIcon, Clock,
  ChevronDown, ChevronUp, Send, Image as ImageIcon, Smile, AtSign,
  Home, Users, Plus, Calendar, Menu, X, Star, Eye, BarChart2,
} from "lucide-react"

type Membership = "associate" | "student" | "premium" | "life" | "inactive" | "committee"
type BorderType = "blue" | "darkBlue" | "gold" | "grey" | "rgby" | "green"

const membershipColors: Record<Membership, string> = {
  associate: "text-amber-500",
  student: "text-green-500",
  premium: "text-blue-800",
  life: "text-yellow-500",
  inactive: "text-gray-400",
  committee: "text-pink-500",
}

const avatarBorderColors: Record<BorderType, string> = {
  blue: "#2563EB", darkBlue: "#1E3A5F", gold: "#D4A017",
  grey: "#6B7280", rgby: "#8B5CF6", green: "#059669",
}

const post = {
  id: "1",
  name: "Shubham Datarkar",
  username: "shubham.datarkar",
  headline: "Web Developer at TCS · 21st Batch (2006–2013)",
  batch: "21st batch (2006–2013)",
  house: "Udaigiri",
  houseColor: "#D4A017",
  membership: "associate" as Membership,
  borderType: "gold" as BorderType,
  isVerified: true,
  timestamp: "June 10, 2026 · 2:34 PM",
  isEdited: false,
  content: `It's a reminder:\n\nOf early mornings, late nights,\nNear-falls and never-quits.\nThis isn't a photo.\nIt's proof that passion, when disciplined,\ndoesn't just play — it wins.\n\nvia @rahulsharma #Cricket #Sports #JNVNagpur`,
  images: [
    "https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=600&fit=crop",
  ],
  upvotes: 56,
  downvotes: 12,
  comments: 18,
  shares: 3,
  views: 1240,
  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
  memberSince: "2024",
  connections: 342,
  posts: 28,
}

interface Comment {
  id: string
  author: string
  username: string
  headline: string
  avatar: string
  text: string
  timestamp: string
  upvotes: number
  replies: Comment[]
  borderType: BorderType
  membership: Membership
}

const commentsData: Comment[] = [
  {
    id: "c1",
    author: "Neha Gupta",
    username: "neha.gupta",
    headline: "IAS Officer · Government of India",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face",
    text: "This is incredibly inspiring! The discipline and dedication that JNV instills in us stays forever. Proud to be a Navodayan! 🏆",
    timestamp: "2h ago",
    upvotes: 14,
    borderType: "gold",
    membership: "life",
    replies: [
      {
        id: "c1r1",
        author: "Priya Sharma",
        username: "priya.sharma",
        headline: "Software Engineer at Google",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
        text: "Absolutely agree, Neha! The values we learned there are priceless.",
        timestamp: "1h ago",
        upvotes: 6,
        borderType: "darkBlue",
        membership: "premium",
        replies: [],
      },
    ],
  },
  {
    id: "c2",
    author: "Dr. Amit Verma",
    username: "amit.verma",
    headline: "Cardiologist · AIIMS Delhi",
    avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face",
    text: "Beautifully said. Every line hits different when you've lived those early mornings at JNV. The discipline there was unparalleled.",
    timestamp: "3h ago",
    upvotes: 22,
    borderType: "rgby",
    membership: "committee",
    replies: [],
  },
  {
    id: "c3",
    author: "Rahul Mehta",
    username: "rahul.mehta",
    headline: "Product Designer at Figma",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    text: "This post just made my morning! The caption is fire 🔥",
    timestamp: "4h ago",
    upvotes: 8,
    borderType: "green",
    membership: "student",
    replies: [],
  },
]

function useDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])
  return { open, setOpen, ref }
}

function RichText({ text }: { text: string }) {
  const parts = text.split(/(@\w[\w.]*|#\w+|https?:\/\/\S+)/g)
  return (
    <p className="text-sm md:text-[15px] text-gray-700 leading-[1.8] whitespace-pre-line">
      {parts.map((p, i) => {
        if (p.startsWith("@") || p.startsWith("#"))
          return <button key={i} className="text-brand font-medium hover:underline">{p}</button>
        if (p.startsWith("http"))
          return <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">{p}</a>
        return <span key={i}>{p}</span>
      })}
    </p>
  )
}

function CommentCard({ comment, nested = false }: { comment: Comment; nested?: boolean }) {
  const [voted, setVoted] = useState<"up" | null>(null)
  const [votes, setVotes] = useState(comment.upvotes)
  const [showReplies, setShowReplies] = useState(true)
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState("")

  return (
    <div className={nested ? "ml-10 mt-3" : ""}>
      <div className="flex gap-3">
        <img
          src={comment.avatar} alt={comment.author}
          className="h-8 w-8 rounded-full object-cover flex-shrink-0 mt-0.5"
          style={{ border: `2px solid ${avatarBorderColors[comment.borderType]}` }}
        />
        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">{comment.author}</span>
              <ShieldCheck className="h-3 w-3 text-blue-500 fill-blue-100 flex-shrink-0" />
              <span className="text-xs text-gray-400 ml-auto">{comment.timestamp}</span>
            </div>
            <p className="text-xs text-gray-500 mb-1">{comment.headline}</p>
            <p className="text-sm text-gray-700 leading-relaxed">{comment.text}</p>
          </div>
          <div className="flex items-center gap-4 mt-1.5 ml-1">
            <button
              onClick={() => { setVoted(voted === "up" ? null : "up"); setVotes(v => voted === "up" ? v - 1 : v + 1) }}
              className={`flex items-center gap-1 text-xs font-medium transition-colors ${voted === "up" ? "text-brand" : "text-gray-400 hover:text-brand"}`}
            >
              <ThumbsUp className={`h-3.5 w-3.5 ${voted === "up" ? "fill-brand" : ""}`} /> {votes}
            </button>
            <button
              onClick={() => setReplying(!replying)}
              className="text-xs font-medium text-gray-400 hover:text-brand transition-colors"
            >
              Reply
            </button>
            {!nested && comment.replies.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showReplies ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
              </button>
            )}
          </div>
          {replying && (
            <div className="flex gap-2 mt-2">
              <img src={post.avatar} alt="" className="h-7 w-7 rounded-full object-cover flex-shrink-0" />
              <div className="flex-1 flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5">
                <input
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder={`Reply to ${comment.author}…`}
                  className="flex-1 text-sm outline-none bg-transparent"
                />
                <button className="text-brand hover:text-brand-600 flex-shrink-0">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {showReplies && comment.replies.map(r => (
        <CommentCard key={r.id} comment={r} nested />
      ))}
    </div>
  )
}

export default function PostDetailPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [voteState, setVoteState] = useState<"up" | "down" | null>(null)
  const [upvotes, setUpvotes] = useState(post.upvotes)
  const [downvotes, setDownvotes] = useState(post.downvotes)
  const [bookmarked, setBookmarked] = useState(false)
  const [commentSort, setCommentSort] = useState<"top" | "new">("top")
  const [commentText, setCommentText] = useState("")
  const [lightboxImg, setLightboxImg] = useState<string | null>(null)
  const [lightboxIdx, setLightboxIdx] = useState(0)
  const { open: menuOpen, setOpen: setMenuOpen, ref: menuRef } = useDropdown()

  const handleUpvote = () => {
    if (voteState === "up") { setUpvotes(v => v - 1); setVoteState(null) }
    else { if (voteState === "down") setDownvotes(v => v - 1); setUpvotes(v => v + 1); setVoteState("up") }
  }
  const handleDownvote = () => {
    if (voteState === "down") { setDownvotes(v => v - 1); setVoteState(null) }
    else { if (voteState === "up") setUpvotes(v => v - 1); setDownvotes(v => v + 1); setVoteState("down") }
  }

  return (
    <div className="min-h-screen bg-[#f3f2ef] pb-16 lg:pb-0">
      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90" onClick={() => setLightboxImg(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setLightboxImg(null)}>
            <X className="h-8 w-8" />
          </button>
          <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
            onClick={e => { e.stopPropagation(); const idx = (lightboxIdx - 1 + post.images.length) % post.images.length; setLightboxIdx(idx); setLightboxImg(post.images[idx]) }}>
            <ChevronDown className="h-8 w-8 -rotate-90" />
          </button>
          <img src={lightboxImg} alt="" className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain" onClick={e => e.stopPropagation()} />
          <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
            onClick={e => { e.stopPropagation(); const idx = (lightboxIdx + 1) % post.images.length; setLightboxIdx(idx); setLightboxImg(post.images[idx]) }}>
            <ChevronDown className="h-8 w-8 rotate-90" />
          </button>
          <span className="absolute bottom-6 text-white/60 text-sm">{lightboxIdx + 1} / {post.images.length}</span>
        </div>
      )}

      {/* Offcanvas overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-xl transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex justify-end p-3 border-b border-gray-100">
          <button onClick={() => setSidebarOpen(false)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {[["Home", Home], ["Network", Users], ["Events", Calendar]].map(([label, Icon]: any) => (
            <a key={label} href="#!" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-brand transition-colors">
              <Icon className="h-5 w-5" /> {label}
            </a>
          ))}
        </nav>
      </div>

      {/* Top nav */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[52px] max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 -ml-1 rounded-lg hover:bg-gray-100" aria-label="Open menu">
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          <a href="/feed" className="flex items-center gap-1.5 text-gray-500 hover:text-brand transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium hidden sm:inline">Back to Feed</span>
          </a>
          <div className="flex-1" />
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-700 shadow-sm">
            <Users className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900 hidden sm:inline">The Parliament</span>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Post Card */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Author Header */}
              <div className="px-4 sm:px-5 pt-5 pb-3 bg-amber-50/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <a href={`/profile/${post.username}`} className="flex-shrink-0">
                      <img src={post.avatar} alt={post.name}
                        className="h-12 w-12 rounded-full object-cover"
                        style={{ border: `2px solid ${avatarBorderColors[post.borderType]}` }}
                      />
                    </a>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <a href={`/profile/${post.username}`} className="text-sm font-semibold text-gray-900 hover:text-brand transition-colors">{post.name}</a>
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-500 fill-blue-100" />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{post.headline}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{post.timestamp}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setBookmarked(!bookmarked)}
                      className={`p-2 rounded-full transition-colors ${bookmarked ? "text-brand bg-brand-50" : "text-gray-400 hover:bg-gray-100"}`}
                    >
                      <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-brand" : ""}`} />
                    </button>
                    <div className="relative" ref={menuRef}>
                      <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                      {menuOpen && (
                        <div className="absolute right-0 top-full z-40 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1.5 shadow-lg">
                          {[
                            { icon: <Edit3 className="h-4 w-4" />, label: "Edit post", href: `/feed/${post.id}/edit` },
                            { icon: <BarChart2 className="h-4 w-4" />, label: "View analytics", href: `/feed/${post.id}/analytics` },
                            { icon: <Copy className="h-4 w-4" />, label: "Copy link" },
                            { icon: <VolumeX className="h-4 w-4" />, label: "Mute user" },
                            { icon: <Flag className="h-4 w-4" />, label: "Report post" },
                            { icon: <Trash2 className="h-4 w-4 text-red-500" />, label: <span className="text-red-600">Delete post</span> },
                          ].map((item, i) => (
                            <a key={i} href={(item as any).href ?? "#!"} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                              <span className="w-4 flex-shrink-0">{item.icon}</span> {item.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Post Content */}
              <div className="px-4 sm:px-5 py-3">
                <RichText text={post.content} />
              </div>

              {/* Image Grid */}
              <div className="grid grid-cols-2 gap-0.5">
                {post.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => { setLightboxIdx(i); setLightboxImg(img) }}
                    className="relative overflow-hidden bg-gray-100 group"
                    style={{ paddingBottom: "66.67%" }}
                  >
                    <img src={img} alt={`Photo ${i + 1}`}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {i === 3 && post.images.length > 4 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-xl font-bold">+{post.images.length - 4}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Engagement Stats */}
              <div className="px-4 sm:px-5 py-3">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {post.views.toLocaleString()} views</span>
                    <span>{upvotes} upvotes</span>
                    <span className="hidden sm:inline">{post.comments} comments</span>
                  </div>
                  <a href={`/feed/${post.id}/analytics`} className="flex items-center gap-1 text-brand hover:text-brand-600 font-medium transition-colors">
                    <BarChart2 className="h-3.5 w-3.5" /> Analytics
                  </a>
                </div>
              </div>

              {/* Reaction Bar */}
              <div className="border-t border-gray-100 px-4 sm:px-5">
                <div className="flex items-center justify-around py-1">
                  <button onClick={handleUpvote} className={`flex items-center gap-1.5 px-2 py-2 rounded-lg transition-all text-sm ${voteState === "up" ? "text-brand bg-brand-50/50" : "text-gray-400 hover:text-brand hover:bg-brand-50/30"}`}>
                    <ThumbsUp className={`h-5 w-5 ${voteState === "up" ? "fill-brand" : ""}`} />
                    <span className="hidden sm:inline text-xs font-medium">Upvote</span>
                    <span className="text-xs font-semibold tabular-nums">{upvotes}</span>
                  </button>
                  <button onClick={handleDownvote} className={`flex items-center gap-1.5 px-2 py-2 rounded-lg transition-all ${voteState === "down" ? "text-red-500 bg-red-50/50" : "text-gray-400 hover:text-red-500 hover:bg-red-50/30"}`}>
                    <ThumbsDown className={`h-5 w-5 ${voteState === "down" ? "fill-red-500" : ""}`} />
                    <span className="hidden sm:inline text-xs font-medium">Downvote</span>
                    <span className="text-xs font-semibold tabular-nums">{downvotes}</span>
                  </button>
                  <button className="flex items-center gap-1.5 px-2 py-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50/30 transition-all">
                    <MessageCircle className="h-5 w-5" />
                    <span className="hidden sm:inline text-xs font-medium">Comment</span>
                    <span className="text-xs font-semibold tabular-nums">{post.comments}</span>
                  </button>
                  <button className="flex items-center gap-1.5 px-2 py-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50/30 transition-all">
                    <Share2 className="h-5 w-5" />
                    <span className="hidden sm:inline text-xs font-medium">Share</span>
                    <span className="text-xs font-semibold tabular-nums">{post.shares}</span>
                  </button>
                  <button className="flex items-center gap-1.5 px-2 py-2 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50/30 transition-all">
                    <Award className="h-5 w-5" />
                    <span className="hidden sm:inline text-xs font-medium">Award</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Comment Section */}
            <div className="bg-white border border-gray-200 rounded-xl">
              <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{post.comments} Comments</h3>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  {(["top", "new"] as const).map(s => (
                    <button key={s} onClick={() => setCommentSort(s)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${commentSort === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      {s === "top" ? "Top" : "Newest"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment Input */}
              <div className="px-4 sm:px-5 py-3 border-b border-gray-100">
                <div className="flex gap-3">
                  <img src={post.avatar} alt="" className="h-9 w-9 rounded-full object-cover flex-shrink-0" style={{ border: "2px solid #D4A017" }} />
                  <div className="flex-1 rounded-xl border border-gray-200 bg-gray-50 focus-within:border-brand focus-within:bg-white focus-within:ring-2 focus-within:ring-brand/10 transition-all">
                    <textarea
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder="Write a comment…"
                      rows={commentText.length > 0 ? 3 : 1}
                      className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm text-gray-700 outline-none placeholder:text-gray-400"
                    />
                    {commentText.length > 0 && (
                      <div className="flex items-center justify-between px-3 pb-2">
                        <div className="flex items-center gap-1">
                          <button className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"><ImageIcon className="h-4 w-4" /></button>
                          <button className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"><Smile className="h-4 w-4" /></button>
                          <button className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"><AtSign className="h-4 w-4" /></button>
                        </div>
                        <button className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors">
                          <Send className="h-3.5 w-3.5" /> Post
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Comments List */}
              <div className="px-4 sm:px-5 py-4 space-y-5">
                {commentsData.map(c => <CommentCard key={c.id} comment={c} />)}
              </div>

              <div className="px-4 sm:px-5 pb-4 text-center">
                <button className="text-sm font-medium text-brand hover:text-brand-600 transition-colors">
                  Load more comments
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-[300px] flex-shrink-0 space-y-4">
            {/* Author Card */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="h-12 bg-gradient-to-r from-brand to-brand-700" />
              <div className="px-4 pb-4 -mt-6">
                <div className="flex items-end justify-between mb-3">
                  <img src={post.avatar} alt={post.name}
                    className="h-14 w-14 rounded-full object-cover border-2 border-white"
                    style={{ outline: `2px solid ${avatarBorderColors[post.borderType]}` }}
                  />
                  <a href={`/profile/${post.username}`} className="rounded-full border border-brand px-3 py-1 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition-colors">
                    View Profile
                  </a>
                </div>
                <h4 className="text-sm font-semibold text-gray-900">{post.name}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{post.headline}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                  <span><strong className="text-gray-900 font-semibold">{post.connections}</strong> connections</span>
                  <span><strong className="text-gray-900 font-semibold">{post.posts}</strong> posts</span>
                </div>
                <button className="mt-3 w-full rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors">
                  + Connect
                </button>
              </div>
            </div>

            {/* Post Stats */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h5 className="text-sm font-semibold text-gray-900 mb-3">Post Stats</h5>
              <div className="space-y-2.5">
                {[
                  { label: "Total Views", value: post.views.toLocaleString(), icon: <Eye className="h-4 w-4 text-blue-500" /> },
                  { label: "Upvotes", value: upvotes, icon: <ThumbsUp className="h-4 w-4 text-brand" /> },
                  { label: "Downvotes", value: downvotes, icon: <ThumbsDown className="h-4 w-4 text-red-400" /> },
                  { label: "Comments", value: post.comments, icon: <MessageCircle className="h-4 w-4 text-green-500" /> },
                  { label: "Shares", value: post.shares, icon: <Share2 className="h-4 w-4 text-purple-500" /> },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {s.icon} {s.label}
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{s.value}</span>
                  </div>
                ))}
              </div>
              <a href={`/feed/${post.id}/analytics`} className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors w-full">
                <BarChart2 className="h-3.5 w-3.5" /> Full Analytics
              </a>
            </div>

            {/* Related Tags */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h5 className="text-sm font-semibold text-gray-900 mb-3">Tags</h5>
              <div className="flex flex-wrap gap-2">
                {["#Cricket", "#Sports", "#JNVNagpur", "#NNAWCA", "#Alumni"].map(tag => (
                  <a key={tag} href="#!" className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand hover:bg-brand hover:text-white transition-colors">
                    {tag}
                  </a>
                ))}
              </div>
            </div>
          </div>
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
          <a href="#!" className="flex flex-col items-center gap-0.5 text-gray-400 px-3 py-1 -mt-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand to-brand-700 flex items-center justify-center shadow-md">
              <Plus className="h-5 w-5 text-white" />
            </div>
          </a>
          {[
            { icon: Calendar, label: "Events", href: "/events" },
            { icon: Menu, label: "Menu", action: () => setSidebarOpen(true) },
          ].map(({ icon: Icon, label, href, action }: any) => (
            href
              ? <a key={label} href={href} className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Icon className="h-5 w-5" /><span className="text-[10px] font-medium">{label}</span></a>
              : <button key={label} onClick={action} className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Icon className="h-5 w-5" /><span className="text-[10px] font-medium">{label}</span></button>
          ))}
        </div>
      </nav>
    </div>
  )
}
