"use client"

import { useState, useEffect, useRef } from "react"
import {
  MoreHorizontal,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Award,
  Bookmark,
  X,
  Flag,
  Mail,
  BookmarkCheck,
  Link as LinkIcon,
  Share2,
  PenSquare,
  Users,
  ChevronRight,
  Sparkles,
  Eye,
  ShieldCheck,
  Trash2,
  VolumeX,
  Copy,
  Edit3,
  Quote,
  Clock,
  Star,
  Home,
  Plus,
  Calendar,
  Menu,
} from "lucide-react"

// --- Types ---
type BorderType = "blue" | "darkBlue" | "gold" | "grey" | "rgby" | "green"
type Membership = "associate" | "student" | "premium" | "life" | "inactive" | "committee"

interface FeedPost {
  id: string
  name: string
  headline: string
  batch?: string
  location?: string
  house?: { name: string; color: string }
  membership: Membership
  timestamp: string
  isVerified?: boolean
  isPinned?: boolean
  isEdited?: boolean
  content?: string
  image?: string
  images?: string[]
  mediaCount?: number
  videoDuration?: string
  quote?: { text: string; author: string; source?: string }
  question?: string
  poll?: { question: string; options: string[] }
  isSponsored?: boolean
  sponsorName?: string
  sponsorUrl?: string
  sponsorTagline?: string
  upvotes: number
  downvotes: number
  comments: number
  shares: number
  avatar: string
  borderType: BorderType
  memberSince?: string
  connections?: number
  posts?: number
}

const membershipIconColor: Record<Membership, string> = {
  associate: "text-amber-500",
  student: "text-green-500",
  premium: "text-blue-800",
  life: "text-yellow-500",
  inactive: "text-gray-400",
  committee: "text-pink-500",
}

interface Connection {
  name: string
  role: string
  avatar: string
  hasStory?: boolean
}

const avatarColors: Record<BorderType, string> = {
  blue: "#2563EB",
  darkBlue: "#1E3A5F",
  gold: "#D4A017",
  grey: "#6B7280",
  rgby: "#8B5CF6",
  green: "#059669",
}

const borderAccents: Record<BorderType, string> = {
  blue: "bg-[#2563EB]/5",
  darkBlue: "bg-[#1E3A5F]/5",
  gold: "bg-[#D4A017]/5",
  grey: "bg-[#6B7280]/5",
  rgby: "bg-[#8B5CF6]/5",
  green: "bg-[#059669]/5",
}

function coloredAvatar(initials: string, color: string, isGradient = false): string {
  if (isGradient) {
    return `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#EF4444"/><stop offset="25%" stop-color="#22C55E"/><stop offset="50%" stop-color="#3B82F6"/><stop offset="75%" stop-color="#EAB308"/><stop offset="100%" stop-color="#A855F7"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(#g)"/><text x="50" y="55" font-size="44" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial,sans-serif" dominant-baseline="middle">${initials}</text></svg>`
    )}`
  }
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="${color}"/><text x="50" y="55" font-size="44" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial,sans-serif" dominant-baseline="middle">${initials}</text></svg>`
  )}`
}

// --- Data ---
const feedPosts: FeedPost[] = [
  {
    id: "1",
    name: "Shubham Datarkar",
    headline: "Web Developer at TCS",
    batch: "21st batch (2006–2013)",
    location: "Nagpur, India",
    house: { name: "Shivaji", color: avatarColors.blue },
    membership: "associate",
    isVerified: true,
    timestamp: "2h",
    content: [
      "It's a reminder:",
      "Of early mornings, late nights,",
      "Near-falls and never-quits.",
      "This isn't a photo.",
      "It's proof that passion, when disciplined,",
      "doesn't just play — it wins.",
      "",
      "via @rahulsharma #Cricket #Sports",
    ].join("\n"),
    images: [
      "https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=800&fit=crop",
    ],
    mediaCount: 4,
    upvotes: 56,
    downvotes: 12,
    comments: 55,
    shares: 3,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    borderType: "blue",
    memberSince: "2024",
    connections: 342,
    posts: 28,
  },
  {
    id: "2",
    name: "Neha Gupta",
    headline: "IAS Officer · Government of India",
    batch: "20th batch (2005–2012)",
    location: "Lucknow, India",
    house: { name: "Shivaji", color: avatarColors.gold },
    membership: "life",
    isVerified: true,
    isEdited: true,
    timestamp: "Edited 2h ago",
    question: "What if every decision you made was driven by empathy?",
    upvotes: 256,
    downvotes: 3,
    comments: 112,
    shares: 67,
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face",
    borderType: "gold",
    memberSince: "2021",
    connections: 1243,
    posts: 87,
  },
  {
    id: "3",
    name: "Priya Sharma",
    headline: "Software Engineer at Google",
    batch: "23rd batch (2008–2015)",
    location: "Bangalore, India",
    house: { name: "Tagore", color: avatarColors.darkBlue },
    membership: "premium",
    isVerified: true,
    timestamp: "4h",
    poll: {
      question: "Which tech stack should our alumni mentorship focus on?",
      options: [
        "AI / Machine Learning",
        "Full Stack Web Development",
        "Cloud & DevOps",
        "Mobile App Development",
      ],
    },
    upvotes: 128,
    downvotes: 5,
    comments: 67,
    shares: 23,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    borderType: "darkBlue",
    memberSince: "2023",
    connections: 567,
    posts: 42,
  },
  {
    id: "4",
    name: "Dr. Amit Verma",
    headline: "Cardiologist · AIIMS Delhi",
    batch: "15th batch (2000–2007)",
    location: "Delhi, India",
    house: { name: "Raman", color: avatarColors.rgby },
    membership: "committee",
    isVerified: true,
    isPinned: true,
    timestamp: "1d",
    quote: {
      text: "The good physician treats the disease; the great physician treats the patient who has the disease. In JNV, we learned not just subjects, but humanity.",
      author: "Dr. William Osler",
      source: "The Principles and Practice of Medicine",
    },
    upvotes: 312,
    downvotes: 1,
    comments: 89,
    shares: 45,
    avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face",
    borderType: "rgby",
    memberSince: "2020",
    connections: 891,
    posts: 156,
  },
  {
    id: "5",
    name: "Rahul Mehta",
    headline: "Product Designer at Figma",
    batch: "24th batch (2009–2016)",
    location: "Mumbai, India",
    house: { name: "Tagore", color: avatarColors.green },
    membership: "student",
    isEdited: true,
    timestamp: "5 Aug 2025",
    content:
      "Building this project for NNAWCA with the confidence of a YouTube ad that says 'No experience required.'",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=800&fit=crop",
    videoDuration: "01:25",
    upvotes: 134,
    downvotes: 8,
    comments: 45,
    shares: 22,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    borderType: "green",
    memberSince: "2024",
    connections: 234,
    posts: 18,
  },
  {
    id: "6",
    name: "Vikram Singh",
    headline: "Founder & CEO · EduStart",
    batch: "18th batch (2003–2010)",
    location: "Pune, India",
    house: { name: "Raman", color: avatarColors.grey },
    membership: "inactive",
    isVerified: true,
    timestamp: "6h",
    content:
      "Just closed our Series A! Grateful to the JNV Nagpur alumni network for the early support and mentorship. To every Navodayan dreaming of building something — start today.\n\n#Startup #Entrepreneurship #JNVAlumni",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=800&fit=crop",
    upvotes: 445,
    downvotes: 2,
    comments: 156,
    shares: 89,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    borderType: "grey",
    memberSince: "2019",
    connections: 2100,
    posts: 312,
  },
]

const connections: Connection[] = [
  { name: "Judy Nguyen", role: "News Anchor · Nagpur", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face" },
  { name: "Amanda Reed", role: "Web Developer · Mumbai", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face", hasStory: true },
  { name: "Billy Vasquez", role: "News Anchor · Delhi", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face" },
  { name: "Shubham Datarkar", role: "Web Developer · NNAWCA", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face" },
  { name: "Carolyn Ortiz", role: "News Anchor · Pune", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face" },
]

const newsItems = [
  { title: "Alumni Reunion 2026 — Save the Date: October 15th", time: "2h" },
  { title: "Featured Alumni: Dr. Amit Verma's Journey in Medicine", time: "3h" },
  { title: "Exclusive Job Postings for Alumni — View Openings", time: "4h" },
  { title: "Mentorship Program: Help Current Students as an Alumni Mentor", time: "6h" },
  { title: "Campus Updates: See What's New at Your Alma Mater", time: "1d" },
]

const awards = [
  { emoji: "🐐", label: "GOAT", cost: 50 },
  { emoji: "💩", label: "Shitpost", cost: 20 },
  { emoji: "🔥", label: "Fire Post", cost: 30 },
  { emoji: "🧠", label: "Big Brain", cost: 40 },
  { emoji: "😂", label: "LOL", cost: 25 },
  { emoji: "🎤", label: "Mic Drop", cost: 35 },
  { emoji: "💪", label: "Support", cost: 30 },
  { emoji: "🤯", label: "WTF", cost: 28 },
  { emoji: "👏", label: "Clap", cost: 22 },
  { emoji: "👑", label: "Crown", cost: 60 },
  { emoji: "😇", label: "Angel", cost: 45 },
  { emoji: "🚀", label: "Rocket", cost: 55 },
]

// --- Award Modal ---
function AwardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const prev = useRef(open)

  useEffect(() => {
    if (prev.current && !open) setSelected(null)
    prev.current = open
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h5 className="text-base font-semibold text-gray-900">Give an Award</h5>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="mb-4 text-xs text-gray-500">Each award costs karma points. Choose one to reward this post.</p>
          <div className="grid grid-cols-4 gap-2">
            {awards.map((a) => (
              <button
                key={a.label}
                onClick={() => setSelected(a.label)}
                className={`flex flex-col items-center rounded-lg p-2.5 transition-all ${
                  selected === a.label
                    ? "bg-brand-50 ring-1 ring-brand"
                    : "hover:bg-gray-50"
                }`}
              >
                <span className="text-xl">{a.emoji}</span>
                <span className="mt-0.5 text-[10px] font-semibold text-gray-700">{a.label}</span>
                <span className="text-[9px] text-gray-400">{a.cost}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
          <span className="text-xs text-gray-400">
            {selected ? `Selected` : "Select an award to continue"}
          </span>
          <button
            disabled={!selected}
            className={`rounded-full px-5 py-1.5 text-xs font-semibold text-white transition-all ${
              selected ? "bg-brand hover:bg-brand-600" : "cursor-not-allowed bg-gray-200"
            }`}
          >
            Give Award
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Dropdown hook ---
function useDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return { open, setOpen, ref }
}

// --- Share Dropdown ---
function ShareDropdown({ shares }: { shares: number }) {
  const { open, setOpen, ref } = useDropdown()

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
      >
        <Share2 className="h-5 w-5" />
        <span className="hidden lg:inline text-xs font-medium">Share</span>
        <span className="text-xs font-semibold tabular-nums">{shares}</span>
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {[
            { icon: <Mail className="h-4 w-4" />, label: "Send via Direct Message" },
            { icon: <BookmarkCheck className="h-4 w-4" />, label: "Bookmark" },
            { icon: <LinkIcon className="h-4 w-4" />, label: "Copy link to post" },
            { icon: <Share2 className="h-4 w-4" />, label: "Share post via ..." },
            { icon: <PenSquare className="h-4 w-4" />, label: "Share to News Feed" },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              <span className="w-4 flex-shrink-0">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Full-width Reaction Bar ---
function ReactionBar({
  initialUpvotes,
  initialDownvotes,
  comments,
  shares,
}: {
  initialUpvotes: number
  initialDownvotes: number
  comments: number
  shares: number
}) {
  const [awardModalOpen, setAwardModalOpen] = useState(false)
  const [voteState, setVoteState] = useState<"up" | "down" | null>(null)
  const [upvotes, setUpvotes] = useState(initialUpvotes)
  const [downvotes, setDownvotes] = useState(initialDownvotes)

  const handleUpvote = () => {
    if (voteState === "up") {
      setUpvotes((v) => v - 1)
      setVoteState(null)
    } else {
      if (voteState === "down") setDownvotes((v) => v - 1)
      setUpvotes((v) => v + 1)
      setVoteState("up")
    }
  }

  const handleDownvote = () => {
    if (voteState === "down") {
      setDownvotes((v) => v - 1)
      setVoteState(null)
    } else {
      if (voteState === "up") setUpvotes((v) => v - 1)
      setDownvotes((v) => v + 1)
      setVoteState("down")
    }
  }

  return (
    <>
      <div className="h-px bg-[#E5E7EB]" />
      <div className="flex items-center justify-around py-1">
        {/* Upvote */}
        <button
          onClick={handleUpvote}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
            voteState === "up"
              ? "text-brand bg-brand-50/50"
              : "text-gray-400 hover:text-brand hover:bg-brand-50/30"
          }`}
        >
          <ThumbsUp className={`h-5 w-5 ${voteState === "up" ? "fill-brand" : ""}`} />
          <span className="hidden lg:inline text-xs font-medium">Upvote</span>
          <span className="text-xs font-semibold tabular-nums">{upvotes}</span>
        </button>

        {/* Downvote */}
        <button
          onClick={handleDownvote}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
            voteState === "down"
              ? "text-red-500 bg-red-50/50"
              : "text-gray-400 hover:text-red-500 hover:bg-red-50/30"
          }`}
        >
          <ThumbsDown className={`h-5 w-5 ${voteState === "down" ? "fill-red-500" : ""}`} />
          <span className="hidden lg:inline text-xs font-medium">Downvote</span>
          <span className="text-xs font-semibold tabular-nums">{downvotes}</span>
        </button>

        {/* Comment */}
        <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50/30 transition-all">
          <MessageCircle className="h-5 w-5" />
          <span className="hidden lg:inline text-xs font-medium">Comment</span>
          <span className="text-xs font-semibold tabular-nums">{comments}</span>
        </button>

        {/* Share */}
        <ShareDropdown shares={shares} />

        {/* Award */}
        <button
          onClick={() => setAwardModalOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50/30 transition-all"
        >
          <Award className="h-5 w-5" />
          <span className="hidden lg:inline text-xs font-medium">Award</span>
        </button>
      </div>
      <AwardModal open={awardModalOpen} onClose={() => setAwardModalOpen(false)} />
    </>
  )
}

// --- Poll Card ---
function PollCard({ question, options }: { question: string; options: string[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const totalVotes = 120
  const results = [
    { label: options[0], votes: 48 },
    { label: options[1], votes: 28 },
    { label: options[2], votes: 32 },
    { label: options[3], votes: 12 },
  ]

  return (
    <div>
      <p className="text-sm font-medium text-gray-900 mb-3">{question}</p>
      <div className="space-y-2">
        {results.map((opt, i) => {
          const pct = Math.round((opt.votes / totalVotes) * 100)
          const isSelected = selected === opt.label
          return (
            <button
              key={i}
              onClick={() => setSelected(opt.label)}
              className={`relative w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-all overflow-hidden ${
                isSelected
                  ? "border-brand bg-brand-50"
                  : selected
                  ? "border-gray-200 opacity-70"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div
                className="absolute inset-0 bg-brand-50/40 transition-all"
                style={{ width: selected ? `${pct}%` : "0%" }}
              />
              <div className="relative flex items-center justify-between">
                <span className={isSelected ? "font-medium text-brand-700" : "text-gray-600"}>
                  {opt.label}
                </span>
                {selected && (
                  <span className="text-xs font-medium text-gray-500">{pct}%</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-gray-400">{totalVotes} votes</p>
    </div>
  )
}

// --- Rich Text Renderer ---
function RichText({ text }: { text: string }) {
  const parts = text.split(/(@\w+|#\w+|https?:\/\/\S+)/g)
  return (
    <p className="text-sm md:text-[15px] text-[#374151] leading-[1.7] whitespace-pre-line">
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          return (
            <button key={i} className="text-brand font-medium hover:underline">
              {part}
            </button>
          )
        }
        if (part.startsWith("#")) {
          return (
            <button key={i} className="text-brand font-medium hover:underline">
              {part}
            </button>
          )
        }
        if (part.startsWith("http")) {
          return (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
              {part}
            </a>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </p>
  )
}

// --- Media Section ---
function MediaSection({ image, mediaCount, videoDuration }: { image: string; mediaCount?: number; videoDuration?: string }) {
  return (
    <div className="relative mt-3 overflow-hidden rounded-lg">
      <img
        src={image}
        alt="Post media"
        className="w-full h-auto max-h-[500px] object-cover"
        loading="lazy"
      />
      {mediaCount && mediaCount > 1 && (
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <Eye className="h-3.5 w-3.5" />
          <span>+{mediaCount - 1} Photos</span>
        </div>
      )}
      {videoDuration && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          <Clock className="h-3 w-3" />
          <span>{videoDuration}</span>
        </div>
      )}
    </div>
  )
}

// --- Quote Block ---
function QuoteBlock({ quote }: { quote: { text: string; author: string; source?: string } }) {
  return (
    <div className="relative mt-2 rounded-xl bg-brand p-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <Quote className="h-6 w-6 text-white/70" />
        </div>
        <div>
          <p className="text-base md:text-lg text-white leading-relaxed font-medium">
            {quote.text}
          </p>
          <p className="mt-3 text-sm text-white/80">&mdash; {quote.author}</p>
        </div>
      </div>
    </div>
  )
}

// --- Feed Card ---
function FeedCard({ post }: { post: FeedPost }) {
  const { open: actionOpen, setOpen: setActionOpen, ref: actionRef } = useDropdown()

  const actionItems = post.isSponsored
    ? [{ icon: <Flag className="h-4 w-4" />, label: "Report Ad" }]
    : [
        { icon: <Bookmark className="h-4 w-4" />, label: "Save post" },
        { icon: <Copy className="h-4 w-4" />, label: "Copy link" },
        { icon: <Edit3 className="h-4 w-4" />, label: "Edit post" },
        { icon: <Trash2 className="h-4 w-4" />, label: "Delete" },
        { icon: <VolumeX className="h-4 w-4" />, label: "Mute user" },
        { icon: <Flag className="h-4 w-4" />, label: "Report post" },
      ]

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl transition-shadow hover:shadow-card">
      {/* Card Header */}
      <div className={`px-4 pt-4 pb-2 ${borderAccents[post.borderType]} rounded-tr-xl`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar with colored border */}
            <a href="#!" className="flex-shrink-0">
              {post.borderType === "rgby" ? (
                <div
                  className="h-12 w-12 rounded-full p-[2px]"
                  style={{ background: "conic-gradient(#EF4444, #EAB308, #22C55E, #3B82F6, #EF4444)" }}
                >
                  <img
                    src={post.avatar}
                    alt={post.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>
              ) : (
                <img
                  src={post.avatar}
                  alt={post.name}
                  className="h-12 w-12 rounded-full object-cover"
                  style={{ border: `2px solid ${avatarColors[post.borderType]}` }}
                />
              )}
            </a>
            {/* Info */}
            <div>
              <div className="flex items-center gap-2">
                <h6 className="text-sm font-semibold text-gray-900 mb-0">
                  <a href="#!" className="hover:text-brand transition-colors">
                    {post.isSponsored ? post.sponsorName : post.name}
                  </a>
                </h6>
                {!post.isSponsored && (
                  <i className={`bi bi-asterisk text-sm ${membershipIconColor[post.membership]}`} />
                )}
                {!post.isSponsored && post.isVerified && (
                  <span className="group relative inline-flex items-center justify-center">
                    <ShieldCheck className="h-[14px] w-[14px] text-blue-500 fill-blue-500/10" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] text-white shadow-lg">
                      Verified Alumni
                    </span>
                  </span>
                )}
                {post.isSponsored && <span className="text-xs text-gray-500">Sponsored</span>}
                <span className="text-xs text-[#6B7280]">
                  {post.timestamp}
                  {post.isEdited && <span className="text-[#6B7280]"> · Edited</span>}
                </span>
              </div>
              {!post.isSponsored && post.batch && (
                <p className="mb-0 text-xs text-gray-500 mt-0.5">{post.batch}</p>
              )}
            </div>
          </div>
          {/* Overflow Menu */}
          <div className="relative" ref={actionRef}>
            <button
              onClick={() => setActionOpen(!actionOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {actionOpen && (
              <div className="absolute right-0 top-full z-40 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1.5 shadow-lg">
                {actionItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setActionOpen(false)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <span className="w-4 flex-shrink-0">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="px-4 pt-2 pb-1">
        {post.content && !post.isSponsored && !post.quote && !post.question && !post.poll && (
          <RichText text={post.content} />
        )}

        {post.isSponsored && (
          <div>
            <p className="text-sm text-gray-700 leading-relaxed">{post.sponsorTagline}</p>
            <p className="text-sm text-gray-700 mt-1">{post.content}</p>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-500">Trusted by 100+ Clients</p>
              <a
                href={post.sponsorUrl}
                target="_blank"
                className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 transition-colors"
              >
                Get Quote
              </a>
            </div>
          </div>
        )}

        {post.poll && <PollCard question={post.poll.question} options={post.poll.options} />}

        {post.quote && <QuoteBlock quote={post.quote} />}

        {post.question && (
          <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-brand to-brand-700 min-h-[140px] flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.12),transparent_70%)]" />
            <div className="absolute top-3 right-3 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur-sm flex items-center gap-1">
              <HelpCircle className="h-3 w-3" />
              Question
            </div>
            <h2 className="relative px-6 text-center text-lg md:text-xl font-bold leading-snug text-white">
              {post.question}
            </h2>
          </div>
        )}

        {post.images && !post.isSponsored ? (
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
            {post.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Photo ${i + 1}`}
                className="w-full h-48 object-cover"
                loading="lazy"
              />
            ))}
          </div>
        ) : post.image && !post.isSponsored ? (
          <MediaSection
            image={post.image}
            mediaCount={post.mediaCount}
            videoDuration={post.videoDuration}
          />
        ) : null}
      </div>

      {/* Reaction Bar */}
      <div className="px-4 pb-2">
        <ReactionBar
          initialUpvotes={post.upvotes}
          initialDownvotes={post.downvotes}
          comments={post.comments}
          shares={post.shares}
        />
      </div>
    </div>
  )
}

// --- Left Sidebar ---
function LeftSidebar({ userName }: { userName: string }) {
  return (
    <div className="space-y-3">
      {/* Profile Card */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="h-[50px] bg-gradient-to-r from-brand to-brand-700" />
        <div className="px-4 pt-0 pb-3">
          <div className="text-center">
            <div className="avatar avatar-lg -mt-6 mb-2 mx-auto">
              <img
                className="h-16 w-16 rounded-full border-2 border-white object-cover"
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face"
                alt=""
              />
            </div>
            <h6 className="text-sm font-semibold text-gray-900 mb-0">
              <a href="#!" className="hover:text-brand transition-colors">{userName}</a>
            </h6>
            <small className="text-xs text-gray-500">Co-founder at Grey Hawks Media</small>
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className="text-center">
                <h6 className="text-xs font-semibold text-gray-900 mb-0">21st</h6>
                <small className="text-[10px] text-gray-500">Batch</small>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <h6 className="text-xs font-semibold text-gray-900 mb-0">Udaigiri</h6>
                <small className="text-[10px] text-gray-500">House</small>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-100 py-2 text-center">
          <a href="#!" className="text-xs font-medium text-brand hover:text-brand-600 transition-colors">Edit Profile</a>
        </div>
      </div>

      {/* Helper Links */}
      <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-gray-500 leading-tight px-2">
        {["About NNAWCA", "Settings", "Help", "nnawca.com", "Privacy Policy", "Terms and Conditions"].map((link, i) => (
          <li key={i}>
            <a href="#!" className="hover:text-brand transition-colors whitespace-nowrap">{link}</a>
          </li>
        ))}
      </ul>

      {/* Powered By */}
      <div className="text-center text-[11px] text-gray-400">
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <span>Powered by</span>
          <span className="font-semibold text-gray-500">NNAWCA</span>
          <span>for JNV Nagpur Alumni</span>
        </div>
      </div>

      {/* Copyright */}
      <p className="text-[10px] text-center text-gray-400 mt-1 leading-relaxed">
        2022-2026 &copy; All Rights Reserved by NNAWCA<br />
        Made by <a href="https://shubhamdatarkar.in/nnawca" target="_blank" className="text-brand hover:underline">Mr. The Kalamwala</a>
      </p>
    </div>
  )
}

// --- HelpCircle icon (used in question banner) ---
function HelpCircle({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  )
}

// --- FeedContent ---
export function FeedContent({ userName }: { userName: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f3f2ef] pb-16 lg:pb-0">
      {/* Offcanvas backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Offcanvas Sidebar (mobile) */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-xl transition-transform lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-end p-3 border-b border-gray-100">
          <button onClick={() => setSidebarOpen(false)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-53px)] px-3 py-4">
          <LeftSidebar userName={userName} />
        </div>
      </div>

      {/* Top Nav */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[52px] max-w-[1400px] items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-700 shadow-sm">
              <Users className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">The Parliament</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-gray-500">{userName}</span>
            <div className="h-7 w-7 overflow-hidden rounded-full bg-gray-200 ring-1 ring-gray-300">
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" alt="" className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
      </header>

      {/* Feed Layout */}
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - desktop only */}
          <div className="hidden lg:block w-full lg:w-[280px] flex-shrink-0">
            <div className="sticky top-20">
              <LeftSidebar userName={userName} />
            </div>
          </div>

          {/* Feed Column */}
          <div className="flex-1 min-w-0 space-y-3">
            {feedPosts.map((post) => (
              <FeedCard key={post.id} post={post} />
            ))}

            {/* Premium CTA */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-sm font-medium text-gray-700">
                <Sparkles className="inline h-4 w-4 text-brand mr-1" />
                Unlock more with Premium Membership
              </p>
              <a
                href="premium-membership.html"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-600 transition-colors"
              >
                Learn more <ChevronRight className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-[340px] flex-shrink-0">
            <div className="sticky top-20 space-y-3">
              {/* Sticky Ad */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-4">
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Sponsored</span>
                  <a href="https://www.google.com" target="_blank" className="mt-2 block">
                    <img src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&h=400&fit=crop" alt="Ad" className="w-full rounded object-cover" />
                  </a>
                  <p className="mt-1.5 text-xs text-gray-400 text-center">Advertisement</p>
                </div>
              </div>

              {/* Connections Widget */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h5 className="text-sm font-semibold text-gray-900">Throw 1 Egg to Poke Them</h5>
                </div>
                <div className="py-1">
                  {connections.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors">
                      <div className={`h-9 w-9 flex-shrink-0 overflow-hidden rounded-full ${c.hasStory ? "ring-2 ring-brand-200" : ""}`}>
                        <img src={c.avatar} alt={c.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{c.name}</p>
                        <p className="truncate text-xs text-gray-500">{c.role}</p>
                      </div>
                      <button
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500 hover:bg-amber-100 transition-colors"
                        title="Throw egg"
                      >
                        🥚
                      </button>
                    </div>
                  ))}
                </div>
                <a
                  href="directory.html#id=new-joined"
                  className="block text-center py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors border-t border-gray-100"
                >
                  View more
                </a>
              </div>

              {/* Alumni News */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h5 className="text-sm font-semibold text-gray-900">Alumni News</h5>
                </div>
                <div className="divide-y divide-gray-50">
                  {newsItems.map((item, i) => (
                    <div key={i} className="px-4 py-2.5 hover:bg-gray-50 transition-colors">
                      <h6 className="text-xs font-medium leading-snug text-gray-700 line-clamp-2">
                        <a href="blog-details.html" className="hover:text-brand transition-colors">{item.title}</a>
                      </h6>
                      <span className="text-[10px] text-gray-400 mt-0.5 block">{item.time}</span>
                    </div>
                  ))}
                </div>
                <button className="flex items-center justify-center gap-1.5 w-full py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors border-t border-gray-100">
                  View all news
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around py-1.5">
          <button className="flex flex-col items-center gap-0.5 text-brand px-3 py-1">
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600 px-3 py-1">
            <Users className="h-5 w-5" />
            <span className="text-[10px] font-medium">Network</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 text-gray-400 px-3 py-1 -mt-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand to-brand-700 flex items-center justify-center shadow-md">
              <Plus className="h-5 w-5 text-white" />
            </div>
          </button>
          <button className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600 px-3 py-1">
            <Calendar className="h-5 w-5" />
            <span className="text-[10px] font-medium">Events</span>
          </button>
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600 px-3 py-1"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
