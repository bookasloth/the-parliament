"use client"

import { useState } from "react"
import {
  Briefcase,
  MapPin,
  CalendarPlus,
  UserPlus,
  MoreHorizontal,
  Asterisk,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Send,
  Award,
  Droplet,
  Cake,
  Home,
  Users,
  Trophy,
  Heart,
  Handshake,
  Lock,
  Globe,
  Mail,
  Phone,
  Plus,
  Minus,
  X,
  ChevronRight,
  PenLine,
} from "lucide-react"

// ─────────────────────────────────────────────
// Props — real data assembled in page.tsx
// ─────────────────────────────────────────────
export interface ProfileViewData {
  name: string
  initials: string
  photoUrl: string | null
  coverUrl: string | null
  headline: string | null
  profession: string | null
  company: string | null
  city: string | null
  bio: string | null
  house: { name: string; color: string } | null
  batchLabel: string | null
  yearsSince: number | null
  memberSince: string | null
  dateOfBirth: string | null
  gender: string | null
  currentStatus: string | null
  membership: { label: string; tier: "premium" | "life" | "student" | "associate" | "inactive" | "committee" }
  isVerified: boolean
  verificationStatus: string
  verifiedOn: string | null
  profileCompletion: number
  connectionsCount: number
  postsCount: number
  higherEducation: string | null
  skills: string[]
  linkedinUrl: string | null
  socialLinks: Record<string, string>
}

const MS_COLOR: Record<ProfileViewData["membership"]["tier"], string> = {
  premium: "#0080ae",
  life: "#d4a800",
  student: "#3ea35f",
  associate: "#2196f3",
  inactive: "#b0b0b0",
  committee: "#9b6cff",
}

const DEFAULT_COVER = "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1400&q=70"

// Radius system — cards 6px, inner elements 4px
const R_CARD = "rounded-[6px]"
const R_EL = "rounded-[4px]"

// ─────────────────────────────────────────────
// Placeholder data — TODO: wire to real models in later rounds
// ─────────────────────────────────────────────
const BADGES = [
  {
    img: "/badges/top-voice.svg",
    name: "Top Voice",
    why: "Earned by publishing 2+ quality articles a month for 3 months running, with strong reads, comments and shares — and staying active in alumni discussions. Reviewed every 90 days.",
  },
  {
    img: "/badges/social-butterfly.svg",
    name: "Social Butterfly",
    why: "Earned by staying highly active — 15+ thoughtful comments a month, joining 2+ events a quarter, and welcoming new members regularly. Reviewed every 90 days.",
  },
  {
    img: "/badges/innovator.svg",
    name: "Innovator",
    why: "Awarded to members who ship original projects, start meaningful initiatives, or bring fresh ideas that move the community forward.",
  },
]

const ACHIEVEMENTS = [
  { icon: PenLine, tint: "#d4a800", bg: "#fff7df", title: "Top Writer", meta: "NNAWCA Alumni Feed · 2024" },
  { icon: Trophy, tint: "#009ae4", bg: "#e0f4ff", title: "Smart India Hackathon — Winner", meta: "National Finals · 2015" },
  { icon: Heart, tint: "#e75480", bg: "#fde7ef", title: "₹50,000 contributed", meta: "Hostel Upgrade campaign" },
]

const PHOTOS = [
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=70",
  "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=900&q=70",
  "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=900&q=70",
]

const BATCHMATES = [
  { name: "Durga Laxne", img: "https://i.pravatar.cc/80?img=15" },
  { name: "Amit Rao", img: "https://i.pravatar.cc/80?img=23" },
  { name: "Neha Pillai", img: "https://i.pravatar.cc/80?img=31" },
  { name: "Rohan Verma", img: "https://i.pravatar.cc/80?img=12" },
  { name: "Sara Khan", img: "https://i.pravatar.cc/80?img=45" },
  { name: "Imran Shah", img: "https://i.pravatar.cc/80?img=51" },
]

const SUGGESTED = [
  { name: "Vikram Singh", sub: "12 mutual connections", img: "https://i.pravatar.cc/80?img=51" },
  { name: "Priya Desai", sub: "Same batch · Nilgiri", img: "https://i.pravatar.cc/80?img=20" },
]

const EVENTS = [
  { day: "28", mon: "DEC", title: "Annual Reunion 2025", sub: "Nagpur · 45 going" },
  { day: "12", mon: "JAN", title: "House Meetup", sub: "Online · RSVP" },
]

// Brand social glyphs (lucide v1 dropped brand icons → inline paths)
const BRAND = {
  linkedin: "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z",
  instagram: "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23a3.7 3.7 0 0 1-.9 1.38 3.7 3.7 0 0 1-1.38.9c-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.43-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.9 5.9 0 0 0-2.13 1.38A5.9 5.9 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13.67.66 1.34 1.07 2.13 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.38 5.9 5.9 0 0 0 1.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.38-2.13A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4zm6.41-11.85a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44z",
  x: "M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z",
  facebook: "M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z",
  github: "M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2 0 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.1 0 4.6-2.9 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z",
  youtube: "M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.5 15.6V8.4l6.3 3.6-6.3 3.6z",
}

// GitHub-style karma heatmap — 52 cells (10 per row × 5 + 2).
// Deterministic values (no Math.random → no hydration mismatch).
const KARMA_LEVELS = ["#ebedf0", "#b3e5ff", "#4dc3ff", "#009ae4", "#005c8c"]
const KARMA_VALUES = Array.from({ length: 52 }, (_, i) => (i * 5 + (i % 7) * 4 + (i % 3) * 6) % 28)
function karmaLevel(v: number) {
  return v === 0 ? 0 : v < 7 ? 1 : v < 14 ? 2 : v < 21 ? 3 : 4
}

// ─────────────────────────────────────────────
// Building blocks
// ─────────────────────────────────────────────
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`${R_CARD} border border-gray-200/80 bg-white soft-shadow overflow-hidden ${className}`}>{children}</div>
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-7 pt-5 pb-1">
      <h5 className="flex items-center gap-2 font-heading text-[15px] font-bold text-gray-900">
        <span className="inline-block h-[17px] w-[6px] rounded bg-brand" />
        {children}
      </h5>
      {action}
    </div>
  )
}

function SoftLink({ children }: { children: React.ReactNode }) {
  return <button className={`${R_EL} bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-100 transition-colors`}>{children}</button>
}

function Timeline({ items }: { items: { role: string; org: string; period: string }[] }) {
  return (
    <div className="relative pl-6">
      <span className="absolute left-[5px] top-1 bottom-1 w-0.5 bg-brand-100" />
      {items.map((it, i) => (
        <div key={i} className="relative mb-4 last:mb-0">
          <span className="absolute -left-[22px] top-1 h-3 w-3 rounded-full border-[3px] border-brand bg-white" />
          <h4 className="font-heading text-sm font-bold text-gray-900">{it.role}</h4>
          <div className="text-[13px] text-gray-700">{it.org}</div>
          {it.period && <div className="text-xs text-gray-400">{it.period}</div>}
        </div>
      ))}
    </div>
  )
}

function Modal({ children, onClose, max = "max-w-md" }: { children: React.ReactNode; onClose: () => void; max?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className={`${R_CARD} w-full ${max} bg-white p-7 shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Feed post
// ─────────────────────────────────────────────
function ReactionBar({ onAward }: { onAward: () => void }) {
  const base = "flex-1 flex items-center justify-center gap-1.5 rounded-[4px] py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
  return (
    <div className="mt-3.5 flex gap-1 border-y border-gray-100 py-1">
      <button className={`${base} hover:text-green-600`}><ThumbsUp className="h-4 w-4" /> Upvote (56)</button>
      <button className={`${base} hover:text-red-500`}><ThumbsDown className="h-4 w-4" /> Downvote (12)</button>
      <button className={base}><MessageCircle className="h-4 w-4" /> Comments (55)</button>
      <button className={base}><Send className="h-4 w-4" /> Share (3)</button>
      <button onClick={onAward} className={`${base} text-amber-600 hover:bg-amber-50`}><Award className="h-4 w-4" /> Award It</button>
    </div>
  )
}

function PostCard({
  avatar,
  name,
  meta,
  tier,
  onAward,
  children,
}: {
  avatar: string
  name: string
  meta: string
  tier?: ProfileViewData["membership"]["tier"]
  onAward: () => void
  children: React.ReactNode
}) {
  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatar} alt="" className="h-[42px] w-[42px] rounded-full object-cover" />
          <div>
            <div className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
              {name}
              {tier && <Asterisk className="h-3.5 w-3.5" style={{ color: MS_COLOR[tier] }} />}
            </div>
            <div className="text-xs text-gray-400">{meta}</div>
          </div>
          <button className="ml-auto text-gray-400 hover:text-gray-600"><MoreHorizontal className="h-5 w-5" /></button>
        </div>
        <div className="mt-3">{children}</div>
        <ReactionBar onAward={onAward} />
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────
// Main view
// ─────────────────────────────────────────────
type Tab = "posts" | "about" | "connections"

export function ProfileView({ data }: { data: ProfileViewData }) {
  const [tab, setTab] = useState<Tab>("posts")
  const [badge, setBadge] = useState<(typeof BADGES)[number] | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [awardOpen, setAwardOpen] = useState(false)
  const [shells, setShells] = useState(1)
  const [paying, setPaying] = useState(false)

  const houseColor = data.house?.color ?? "#1a3a6b"
  const msColor = MS_COLOR[data.membership.tier]
  const cover = data.coverUrl ?? DEFAULT_COVER

  const metaBits: { icon: React.ReactNode; text: string }[] = []
  if (data.profession) metaBits.push({ icon: <Briefcase className="h-4 w-4" />, text: data.profession })
  if (data.city) metaBits.push({ icon: <MapPin className="h-4 w-4" />, text: data.city })
  if (data.memberSince) metaBits.push({ icon: <CalendarPlus className="h-4 w-4" />, text: `NNAWCA member since ${data.memberSince}` })

  const socials: { key: string; label: string; href: string; path?: string; lucide?: typeof Globe }[] = [
    { key: "linkedin", label: "LinkedIn", href: data.linkedinUrl ?? "#", path: BRAND.linkedin },
    { key: "website", label: "Website", href: data.socialLinks.website ?? "#", lucide: Globe },
    { key: "instagram", label: "Instagram", href: data.socialLinks.instagram ?? "#", path: BRAND.instagram },
    { key: "x", label: "X", href: data.socialLinks.x ?? "#", path: BRAND.x },
    { key: "facebook", label: "Facebook", href: data.socialLinks.facebook ?? "#", path: BRAND.facebook },
    { key: "github", label: "GitHub", href: data.socialLinks.github ?? "#", path: BRAND.github },
    { key: "youtube", label: "YouTube", href: data.socialLinks.youtube ?? "#", path: BRAND.youtube },
    { key: "email", label: "Email", href: "#", lucide: Mail },
  ]

  return (
    <div className="min-h-screen bg-[#eef0f4] px-4 py-6 font-body">
      <div className="mx-auto max-w-[1200px]">

        {/* ===== HEADER ===== */}
        <Card>
          <div className="relative h-[200px] bg-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="h-full w-full object-cover" />
            {data.house && (
              <span className="glass-strong absolute right-5 top-4 flex items-center gap-2 rounded-[4px] px-3 py-1.5 text-xs font-bold text-gray-800">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: houseColor }} />
                {data.house.name} House
              </span>
            )}
          </div>
          <div className="relative px-7 pb-2">
            <div className="flex flex-wrap items-end justify-between gap-3.5">
              <div>
                {/* avatar with membership-colored ring */}
                <div className="-mt-[62px] inline-block rounded-full bg-white p-[5px]" style={{ boxShadow: `0 0 0 4px ${msColor}` }}>
                  {data.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.photoUrl} alt={data.name} className="h-[118px] w-[118px] rounded-full object-cover" />
                  ) : (
                    <div className="flex h-[118px] w-[118px] items-center justify-center rounded-full bg-brand-50 text-3xl font-bold text-brand-600">{data.initials}</div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <h1 className="font-heading text-2xl font-extrabold tracking-tight text-gray-900">{data.name}</h1>
                  <Asterisk className="h-4 w-4" style={{ color: msColor }} aria-label={`${data.membership.label} member`} />
                  {data.isVerified && <ShieldCheck className="h-5 w-5 text-brand" aria-label="Verified" />}
                </div>
                <p className="mt-0.5 text-[13px] text-gray-500">{data.connectionsCount} Connections</p>
                {/* earned badges (images, clickable) */}
                <div className="mt-2.5 flex gap-2.5">
                  {BADGES.map((b) => (
                    <button key={b.name} onClick={() => setBadge(b)} title={`${b.name} — why?`} className="transition-transform hover:-translate-y-0.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={b.img} alt={b.name} className="h-9 w-9" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className={`${R_EL} flex items-center gap-1.5 bg-brand px-[18px] py-2.5 text-[13px] font-semibold text-white hover:bg-brand-600 transition-colors`}>
                  <UserPlus className="h-4 w-4" /> Connect
                </button>
                <button className={`${R_EL} flex h-[42px] w-[42px] items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50`}>
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>
            </div>

            {metaBits.length > 0 && (
              <div className="mt-3.5 flex flex-wrap items-center gap-x-[18px] gap-y-1.5 border-t border-gray-100 pt-3 text-[13px] text-gray-600">
                {metaBits.map((m, i) => (
                  <span key={i} className="flex items-center gap-1.5"><span className="text-brand">{m.icon}</span>{m.text}</span>
                ))}
                {data.yearsSince !== null && <span className="font-semibold text-brand">{data.yearsSince} years since graduation</span>}
              </div>
            )}

            {/* tabs */}
            <div className="mt-3 flex gap-1.5 border-t border-gray-100 px-1 pt-1.5">
              {([["posts", "Posts"], ["about", "About"], ["connections", "Connections"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`border-b-[3px] px-4 py-3 text-sm font-semibold transition-colors ${tab === key ? "border-brand text-brand" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                >
                  {label}
                  {key === "connections" && <span className="ml-1 rounded-[6px] bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-600">{data.connectionsCount}</span>}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* ===== TWO COLUMN ===== */}
        <div className="mt-[18px] grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[1.6fr_1fr]">

          {/* ===== LEFT ===== */}
          <div className="flex flex-col gap-[18px]">
            {tab === "posts" && (
              <>
                <PostCard avatar={data.photoUrl ?? "https://i.pravatar.cc/80?img=68"} name={data.name} meta={`${data.batchLabel ?? "Alumni"} · 2h`} tier={data.membership.tier} onAward={() => setAwardOpen(true)}>
                  <div className="space-y-0.5 text-sm leading-relaxed text-gray-700">
                    <p>It&apos;s a reminder:</p>
                    <p>Of early mornings, late nights, near-falls and never-quits.</p>
                    <p>This isn&apos;t a photo. It&apos;s proof that passion, when disciplined, doesn&apos;t just play — it wins.</p>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=900&q=70" alt="" className={`mt-2.5 w-full ${R_EL}`} />
                </PostCard>

                <Card>
                  <div className="p-6">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-[42px] w-[42px] items-center justify-center ${R_EL} bg-gray-100 text-lg`}>🦅</div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">Grey Hawks — Marketing Agency</div>
                        <div className="text-xs text-gray-400">Sponsored</div>
                      </div>
                      <button className="ml-auto text-gray-400 hover:text-gray-600"><MoreHorizontal className="h-5 w-5" /></button>
                    </div>
                    <p className="mt-3 text-[13.5px] leading-relaxed text-gray-700">Grey Hawks Media helps businesses grow online — social, content, SEO and digital advertising.</p>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=70" alt="" className="w-full" />
                  <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/60 px-7 py-3">
                    <span className="text-xs text-gray-500">Trusted by 100+ clients</span>
                    <SoftLink>Get Quote</SoftLink>
                  </div>
                </Card>

                <PostCard avatar={data.photoUrl ?? "https://i.pravatar.cc/80?img=68"} name={data.name} meta={`${data.batchLabel ?? "Alumni"} · 5h`} tier={data.membership.tier} onAward={() => setAwardOpen(true)}>
                  <p className="mb-3 text-sm font-semibold text-gray-900">How do you protect your business against cyber-crime?</p>
                  <div className="space-y-2">
                    {["We have cybersecurity insurance coverage", "Our dedicated staff will protect us", "We give regular training for best practices", "Third-party vendor protection"].map((o) => (
                      <button key={o} className={`block w-full ${R_EL} border-[1.5px] border-gray-200 px-4 py-2.5 text-left text-[13px] font-medium text-gray-700 hover:border-brand hover:bg-brand-50/40 transition-colors`}>{o}</button>
                    ))}
                  </div>
                </PostCard>

                <button className={`flex items-center justify-center gap-2 ${R_EL} bg-brand-50 py-3.5 text-sm font-semibold text-brand-600 hover:bg-brand-100 transition-colors`}>
                  <Lock className="h-4 w-4" /> Unlock more with Premium Membership
                </button>
              </>
            )}

            {tab === "about" && (
              <>
                <Card>
                  <SectionTitle action={<SoftLink>Know Your Schoolmate</SoftLink>}>About {data.name.split(" ")[0]}</SectionTitle>
                  <div className="px-7 pb-6 pt-1">
                    <p className="text-[13.5px] leading-relaxed text-gray-700">{data.bio ?? "This schoolmate hasn't added a bio yet."}</p>
                    {data.skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {data.skills.map((s) => <span key={s} className="rounded-[6px] bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">{s}</span>)}
                      </div>
                    )}
                  </div>
                </Card>

                <Card>
                  <SectionTitle>Career journey</SectionTitle>
                  <div className="px-7 pb-6 pt-2">
                    <Timeline items={[
                      { role: "Co-Founder", org: data.company ?? "Grey Hawks Media", period: "2019 — Present" },
                      { role: data.profession ?? "Developer", org: "Freelance & consulting", period: "2015 — 2019" },
                    ]} />
                  </div>
                </Card>

                <Card>
                  <SectionTitle>Education</SectionTitle>
                  <div className="px-7 pb-6 pt-2">
                    <Timeline items={[
                      ...(data.higherEducation ? [{ role: data.higherEducation, org: "Higher education", period: "" }] : []),
                      { role: "JNV Nagpur", org: data.house ? `${data.house.name} House` : "Jawahar Navodaya Vidyalaya", period: data.batchLabel ?? "" },
                    ]} />
                  </div>
                </Card>

                {/* Mentorship */}
                <div className={`flex items-center gap-3.5 ${R_CARD} border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 px-7 py-5`}>
                  <div className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center ${R_EL} bg-green-600 text-white`}><Handshake className="h-5 w-5" /></div>
                  <div>
                    <h4 className="font-heading text-[15px] font-bold text-green-800">Available to mentor</h4>
                    <p className="text-xs text-green-700">Product · Careers · MBA prep — open to alumni &amp; students</p>
                  </div>
                  <button className={`ml-auto ${R_EL} border-[1.5px] border-green-600 bg-white px-3.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-600 hover:text-white transition-colors`}>Request</button>
                </div>

                {/* Achievements as cards */}
                <Card>
                  <SectionTitle>Achievements &amp; awards</SectionTitle>
                  <div className="grid gap-2.5 px-7 pb-6 pt-2">
                    {ACHIEVEMENTS.map((a) => {
                      const Icon = a.icon
                      return (
                        <div key={a.title} className={`group flex items-center gap-3.5 ${R_EL} border border-gray-100 bg-white p-3.5 transition-all hover:border-gray-200 hover:shadow-sm`}>
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center ${R_EL}`} style={{ background: a.bg, color: a.tint }}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-heading text-[13.5px] font-bold text-gray-900">{a.title}</div>
                            <div className="text-xs text-gray-500">{a.meta}</div>
                          </div>
                          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      )
                    })}
                  </div>
                </Card>

                {/* Gallery (clickable) */}
                <Card>
                  <SectionTitle action={<span className="text-xs text-gray-400">{PHOTOS.length} photos</span>}>Photos &amp; memories</SectionTitle>
                  <div className="grid grid-cols-3 gap-2 px-7 pb-6 pt-1">
                    {PHOTOS.map((src) => (
                      <button key={src} onClick={() => setLightbox(src)} className={`group relative overflow-hidden ${R_EL}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="h-[96px] w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                      </button>
                    ))}
                  </div>
                </Card>
              </>
            )}

            {tab === "connections" && (
              <>
                <Card>
                  <SectionTitle action={<SoftLink>See all</SoftLink>}>Batchmates <span className="rounded-[6px] bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-500">{data.connectionsCount}</span></SectionTitle>
                  <div className="grid grid-cols-3 gap-2.5 px-7 pb-6 pt-2 sm:grid-cols-4">
                    {BATCHMATES.map((b) => (
                      <div key={b.name} className={`${R_EL} border border-gray-200 p-3 text-center`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={b.img} alt="" className="mx-auto h-[52px] w-[52px] rounded-full object-cover" />
                        <div className="my-2 text-xs font-semibold leading-tight text-gray-800">{b.name}</div>
                        <button className={`w-full ${R_EL} bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-600 hover:bg-brand-100`}>+ Connect</button>
                      </div>
                    ))}
                  </div>
                </Card>
                <Card>
                  <SectionTitle>Suggested connections</SectionTitle>
                  <div className="px-7 pb-5 pt-1">
                    {SUGGESTED.map((s) => (
                      <div key={s.name} className="flex items-center gap-2.5 py-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.img} alt="" className="h-10 w-10 rounded-full object-cover" />
                        <div><div className="text-[13.5px] font-semibold text-gray-800">{s.name}</div><div className="text-xs text-gray-400">{s.sub}</div></div>
                        <button className={`ml-auto ${R_EL} border-[1.5px] border-brand px-3 py-1 text-xs font-semibold text-brand hover:bg-brand-50`}><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* ===== RIGHT ===== */}
          <div className="flex flex-col gap-[18px]">
            <Card>
              <div className="p-7">
                <div className="text-xs font-bold tracking-wide text-brand">PROFILE STRENGTH</div>
                <div className="my-2.5 h-2 overflow-hidden rounded-[6px] bg-gray-100">
                  <div className="h-full rounded-[6px] bg-gradient-to-r from-gold-500 to-gold-300" style={{ width: `${data.profileCompletion}%` }} />
                </div>
                <div className="text-[12.5px] text-gray-500">{data.profileCompletion}% — {data.profileCompletion >= 90 ? "All-Star ✦" : "add more to reach All-Star"}</div>
              </div>
            </Card>

            <Card>
              <SectionTitle>Quick stats</SectionTitle>
              <div className="px-7 pb-5 pt-1">
                {[["Karma points", "1,240"], ["Connections", String(data.connectionsCount)], ["Posts", String(data.postsCount)], ["Events attended", "9"]].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b border-gray-50 py-2.5 text-sm last:border-0"><span className="text-gray-500">{k}</span><b className="font-heading text-base">{v}</b></div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionTitle>Details</SectionTitle>
              <ul className="px-7 pb-5 pt-1">
                {data.dateOfBirth && <li className="flex items-center gap-2.5 border-b border-gray-50 py-2 text-[13.5px] text-gray-600"><Cake className="h-4 w-4 text-blue-500" /> Date of Birth <b className="ml-auto font-semibold text-gray-800">{data.dateOfBirth}</b></li>}
                <li className="flex items-center gap-2.5 border-b border-gray-50 py-2 text-[13.5px] text-gray-600"><Droplet className="h-4 w-4 text-red-500" /> Blood Group <b className="ml-auto font-semibold text-gray-800">—</b></li>
                <li className="flex items-center gap-2.5 border-b border-gray-50 py-2 text-[13.5px] text-gray-600"><Award className="h-4 w-4 text-green-600" /> Membership <b className="ml-auto font-semibold" style={{ color: msColor }}>{data.membership.label}</b></li>
                {data.house && <li className="flex items-center gap-2.5 border-b border-gray-50 py-2 text-[13.5px] text-gray-600"><Home className="h-4 w-4" style={{ color: houseColor }} /> House <b className="ml-auto font-semibold text-gray-800">{data.house.name}</b></li>}
                {data.batchLabel && <li className="flex items-center gap-2.5 py-2 text-[13.5px] text-gray-600"><Users className="h-4 w-4 text-indigo-500" /> Batch <b className="ml-auto font-semibold text-gray-800">{data.batchLabel}</b></li>}
              </ul>
            </Card>

            {/* Contact & social — 4x2 icons + request button */}
            <Card>
              <SectionTitle>Contact &amp; social</SectionTitle>
              <div className="px-7 pb-6 pt-2">
                <div className="grid grid-cols-4 gap-2.5">
                  {socials.map((s) => {
                    const L = s.lucide
                    return (
                      <a key={s.key} href={s.href} target="_blank" rel="noreferrer" title={s.label} className={`flex aspect-square items-center justify-center ${R_EL} border border-gray-200 text-gray-600 hover:border-brand hover:bg-brand-50 hover:text-brand transition-colors`}>
                        {L ? <L className="h-[18px] w-[18px]" /> : <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]"><path d={s.path} /></svg>}
                      </a>
                    )
                  })}
                </div>
                <button className={`mt-3 flex w-full items-center justify-center gap-2 ${R_EL} bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-600 transition-colors`}>
                  <Phone className="h-4 w-4" /> Request Phone Number
                </button>
              </div>
            </Card>

            {/* Registration info */}
            <Card>
              <SectionTitle action={<SoftLink>View Details</SoftLink>}>Registration Info</SectionTitle>
              <ul className="px-7 pb-5 pt-1">
                <li className="flex items-center gap-2.5 border-b border-gray-50 py-2 text-[13.5px] text-gray-600"><ShieldCheck className="h-4 w-4 text-green-600" /> Status <b className="ml-auto font-semibold capitalize text-gray-800">{data.verificationStatus}</b></li>
                {data.verifiedOn && <li className="flex items-center gap-2.5 border-b border-gray-50 py-2 text-[13.5px] text-gray-600"><UserPlus className="h-4 w-4 text-brand" /> Verified on <b className="ml-auto font-semibold text-gray-800">{data.verifiedOn}</b></li>}
                <li className="flex items-center gap-2.5 py-2 text-[13.5px] text-gray-600"><CalendarPlus className="h-4 w-4 text-blue-500" /> Member since <b className="ml-auto font-semibold text-gray-800">{data.memberSince ?? "—"}</b></li>
              </ul>
            </Card>

            {/* Karma — GitHub-style activity */}
            <Card>
              <SectionTitle action={<span className="text-xs text-gray-400">1,240 total</span>}>Karma activity</SectionTitle>
              <div className="px-7 pb-6 pt-2">
                <div className="grid grid-cols-10 gap-[5px]">
                  {KARMA_VALUES.map((v, i) => (
                    <div key={i} className="group relative">
                      <span className="block aspect-square rounded-[4px] transition-transform group-hover:scale-110" style={{ background: KARMA_LEVELS[karmaLevel(v)] }} />
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-[4px] bg-gray-900 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {v} karma
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-gray-400">
                  Less {KARMA_LEVELS.map((c) => <span key={c} className="inline-block h-2.5 w-2.5 rounded-[4px]" style={{ background: c }} />)} More
                </div>
              </div>
            </Card>

            {/* Upcoming events */}
            <Card>
              <SectionTitle>Upcoming events</SectionTitle>
              <div className="px-7 pb-5 pt-1">
                {EVENTS.map((e) => (
                  <div key={e.title} className="flex items-center gap-3 border-b border-gray-50 py-2.5 last:border-0">
                    <div className={`flex h-[46px] w-[46px] flex-col items-center justify-center ${R_EL} bg-brand-50 font-bold leading-none text-brand-600`}>{e.day}<span className="text-[10px] font-semibold">{e.mon}</span></div>
                    <div><div className="text-[13.5px] font-semibold text-gray-800">{e.title}</div><div className="text-xs text-gray-400">{e.sub}</div></div>
                    <ChevronRight className="ml-auto h-4 w-4 text-gray-300" />
                  </div>
                ))}
              </div>
            </Card>

            {/* Promoted */}
            <div className={`relative ${R_CARD} bg-gradient-to-br from-navy-700 to-navy-500 p-7 text-white`}>
              <span className="absolute right-5 top-4 rounded-[6px] bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold">Promoted</span>
              <h3 className="mt-1.5 font-heading text-[17px] font-bold">NNAWCA Account Manager</h3>
              <div className="mb-2 mt-0.5 text-xs text-navy-100">Your personal guide to the alumni portal</div>
              <p className="text-xs leading-relaxed text-navy-100">Here to help you connect with batchmates, explore opportunities, and make the most of the community.</p>
              <div className="my-3 flex items-center">
                {["32", "44", "55"].map((n, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={n} src={`https://i.pravatar.cc/60?img=${n}`} alt="" className={`h-8 w-8 rounded-full border-2 border-navy-500 ${i > 0 ? "-ml-2" : ""}`} />
                ))}
                <span className="ml-3 text-[11.5px] text-navy-100">Helping 150+ members stay connected</span>
              </div>
              <button className={`mt-1.5 flex w-full items-center justify-center gap-2 ${R_EL} bg-gold-500 py-2.5 text-[13px] font-bold text-gray-900 hover:bg-gold-400 transition-colors`}><Heart className="h-4 w-4" /> Schedule a Google Meet</button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MODALS ===== */}
      {badge && (
        <Modal onClose={() => setBadge(null)} max="max-w-sm">
          <div className="flex flex-col items-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={badge.img} alt={badge.name} className="h-20 w-20" />
            <h3 className="mt-3 font-heading text-lg font-bold text-gray-900">{badge.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{badge.why}</p>
            <button onClick={() => setBadge(null)} className={`mt-5 w-full ${R_EL} bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-600`}>Got it</button>
          </div>
        </Modal>
      )}

      {lightbox && (
        <Modal onClose={() => setLightbox(null)} max="max-w-2xl">
          <div className="relative">
            <button onClick={() => setLightbox(null)} className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 shadow-md hover:text-gray-900"><X className="h-5 w-5" /></button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox} alt="" className={`max-h-[70vh] w-full object-contain ${R_EL}`} />
          </div>
        </Modal>
      )}

      {awardOpen && (
        <Modal onClose={() => { setAwardOpen(false); setPaying(false) }} max="max-w-sm">
          <div className="flex flex-col items-center text-center">
            <h3 className="font-heading text-lg font-bold text-gray-900">Give an Award 🐚</h3>
            <p className="mt-1 text-xs text-gray-500">Each shell costs ₹10. Stack a few to make it count.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shell.svg" alt="Shell" className="my-4 h-28 w-28 drop-shadow" />
            <div className="flex items-center gap-5">
              <button onClick={() => setShells((s) => Math.max(1, s - 1))} className={`flex h-11 w-11 items-center justify-center ${R_EL} border border-gray-200 text-gray-700 hover:bg-gray-50`}><Minus className="h-5 w-5" /></button>
              <div className="font-heading text-3xl font-extrabold text-gray-900 tabular-nums">{shells}</div>
              <button onClick={() => setShells((s) => Math.min(99, s + 1))} className={`flex h-11 w-11 items-center justify-center ${R_EL} border border-gray-200 text-gray-700 hover:bg-gray-50`}><Plus className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 text-sm text-gray-500">{shells} shell{shells > 1 ? "s" : ""} × ₹10 = <b className="text-gray-900">₹{shells * 10}</b></div>
            <button
              onClick={() => setPaying(true)} // TODO: integrate Razorpay checkout
              className={`mt-5 flex w-full items-center justify-center gap-2 ${R_EL} bg-brand py-3 text-sm font-bold text-white hover:bg-brand-600`}
            >
              {paying ? "Redirecting to payment…" : `Award • ₹${shells * 10}`}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
