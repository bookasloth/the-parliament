"use client"

import { useState } from "react"
import { UpgradePrompt } from "@/components/shared/UpgradePrompt"
import { AvatarUploader } from "@/components/shared/AvatarUploader"
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
  Plus,
  Minus,
  X,
  ChevronRight,
  PenLine,
  Mic,
  Zap,
  Shield,
  Egg,
  Coins,
  CheckCircle2,
  UserCircle2,
  FileText,
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
  homeTown: string | null
  correspondenceAddress: string | null
  bloodGroup: string | null
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
  owner: {
    planCode: import("@/config/membership").PlanCode
    canListBusiness: boolean
    canApplyMentor: boolean
  } | null
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
                <div className="relative -mt-[62px] inline-block rounded-full bg-white p-[5px]" style={{ boxShadow: `0 0 0 4px ${msColor}` }}>
                  {data.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.photoUrl} alt={data.name} className="h-[118px] w-[118px] rounded-full object-cover" />
                  ) : (
                    <div className="flex h-[118px] w-[118px] items-center justify-center rounded-full bg-brand-50 text-3xl font-bold text-brand-600">{data.initials}</div>
                  )}
                  {data.owner && <AvatarUploader />}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <h1 className="font-heading text-2xl font-extrabold tracking-tight text-gray-900">{data.name}</h1>
                  <Asterisk className="h-4 w-4" style={{ color: msColor }} aria-label={`${data.membership.label} member`} />
                  {data.isVerified && <ShieldCheck className="h-5 w-5 text-brand" aria-label="Verified" />}
                </div>
                <p className="mt-0.5 text-[13px] text-gray-500">{data.connectionsCount} Connections</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {[
                    { name: "Top Voice", Icon: Mic, tint: "#22a06b", bg: "#e6f7ef" },
                    { name: "Social Fly", Icon: Zap, tint: "#7a3ff2", bg: "#efe8ff" },
                    { name: "Innovator", Icon: Shield, tint: "#d4a800", bg: "#fff4d1" },
                  ].map(({ name, Icon, tint, bg }) => (
                    <button
                      key={name}
                      onClick={() => setBadge(BADGES.find((x) => x.name === name || x.name.startsWith(name.split(" ")[0])) ?? BADGES[0])}
                      className={`${R_EL} flex items-center gap-1.5 px-3 py-1 text-[13px] font-bold transition-transform hover:-translate-y-0.5`}
                      style={{ background: bg, color: tint }}
                    >
                      <Icon className="h-4 w-4" fill={tint} strokeWidth={0} />
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className={`${R_EL} flex items-center gap-1.5 border border-brand bg-white px-[18px] py-2.5 text-[13px] font-semibold text-brand hover:bg-brand hover:text-white transition-colors`}>
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

                {/* Owner-only, membership-gated actions */}
                {data.owner && (
                  <Card>
                    <SectionTitle>Membership perks</SectionTitle>
                    <div className="space-y-3 px-7 pb-6 pt-2">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-800">List your business</p>
                          <p className="text-xs text-gray-500">Feature your business in the alumni directory.</p>
                        </div>
                        {data.owner.canListBusiness ? (
                          <a href="/business/new" className={`${R_EL} border-[1.5px] border-brand bg-white px-3.5 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition-colors`}>List business</a>
                        ) : (
                          <UpgradePrompt currentPlan={data.owner.planCode} feature="Listing your business" compact />
                        )}
                      </div>
                      <div className="flex items-center gap-3 border-t border-gray-50 pt-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-800">Apply as a mentor</p>
                          <p className="text-xs text-gray-500">Offer mentorship to students and alumni.</p>
                        </div>
                        {data.owner.canApplyMentor ? (
                          <button className={`${R_EL} border-[1.5px] border-brand bg-white px-3.5 py-1.5 text-xs font-semibold text-brand hover:bg-brand hover:text-white transition-colors`}>Apply</button>
                        ) : (
                          <UpgradePrompt currentPlan={data.owner.planCode} feature="Applying as a mentor" compact />
                        )}
                      </div>
                    </div>
                  </Card>
                )}

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
            {/* About */}
            <Card>
              <div className="flex items-center justify-between px-7 pt-5">
                <h5 className="font-heading text-[15px] font-bold text-brand">About {data.name.split(" ")[0]}</h5>
                <SoftLink>Know More</SoftLink>
              </div>
              <div className="px-7 pb-5 pt-3">
                <p className="text-[13.5px] leading-relaxed text-gray-700">{data.bio ?? `${data.name} is a member of the NNAWCA alumni community.`}</p>
                <ul className="mt-4 space-y-2.5">
                  {data.dateOfBirth && <li className="flex items-center gap-2.5 text-[13.5px] text-gray-600"><Cake className="h-4 w-4 text-brand" /> DOB: <b className="font-semibold text-gray-900">{data.dateOfBirth}</b></li>}
                  <li className="flex items-center gap-2.5 text-[13.5px] text-gray-600"><Droplet className="h-4 w-4 text-red-500" /> Blood Group: <b className="font-semibold text-gray-900">{data.bloodGroup ?? "—"}</b></li>
                  <li className="flex items-center gap-2.5 text-[13.5px] text-gray-600"><FileText className="h-4 w-4 text-green-600" /> Membership: <b className="font-semibold" style={{ color: msColor }}>{data.membership.label}</b></li>
                  {data.house && <li className="flex items-center gap-2.5 text-[13.5px] text-gray-600"><Home className="h-4 w-4" style={{ color: houseColor }} /> House: <b className="font-semibold text-gray-900">{data.house.name}</b></li>}
                  {data.batchLabel && <li className="flex items-center gap-2.5 text-[13.5px] text-gray-600"><Users className="h-4 w-4 text-indigo-500" /> Batch: <b className="font-semibold text-gray-900">{data.batchLabel}</b></li>}
                </ul>
              </div>
            </Card>

            {/* Achievements */}
            <Card>
              <SectionTitle>{data.name.split(" ")[0]}&apos;s Achievements</SectionTitle>
              <div className="px-7 pb-5 pt-2">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-500">Badges</div>
                <div className="mt-2.5 flex items-center gap-2.5">
                  {[
                    { Icon: Mic, tint: "#22a06b", bg: "#e6f7ef" },
                    { Icon: Zap, tint: "#7a3ff2", bg: "#efe8ff" },
                    { Icon: Shield, tint: "#d4a800", bg: "#fff4d1" },
                  ].map(({ Icon, tint, bg }, i) => (
                    <span key={i} className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: bg, color: tint }}>
                      <Icon className="h-4 w-4" fill={tint} strokeWidth={0} />
                    </span>
                  ))}
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">+5</span>
                </div>
                <button className="mt-2.5 text-xs font-semibold text-brand hover:underline">View Your Badges</button>

                <div className="mt-5 text-xs font-bold uppercase tracking-wide text-gray-500">Collectibles</div>
                <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                  <div className={`flex items-center gap-2.5 ${R_EL} border border-gray-100 bg-gray-50/60 p-3`}>
                    <Egg className="h-6 w-6 text-amber-500" fill="#f5c518" strokeWidth={1.5} />
                    <div><div className="font-heading text-base font-bold text-gray-900">$8</div><div className="text-[11px] text-gray-500">Golden Eggs</div></div>
                  </div>
                  <div className={`flex items-center gap-2.5 ${R_EL} border border-gray-100 bg-gray-50/60 p-3`}>
                    <Coins className="h-6 w-6 text-amber-500" />
                    <div><div className="font-heading text-base font-bold text-gray-900">1,290</div><div className="text-[11px] text-gray-500">Karma Points</div></div>
                  </div>
                </div>

                <div className="mt-5 text-xs font-bold uppercase tracking-wide text-gray-500">Trophies</div>
                <ul className="mt-2.5 space-y-2">
                  {[
                    { title: "Coding Clash Winner", sub: "Awarded for placing 1st in Human Hackathon 2024" },
                    { title: "Annual Quiz Champion", sub: "Topped the Inter House Annual Quiz Contest" },
                    { title: "Tournament Titans", sub: "All-round House Innovator Challenge" },
                    { title: "House Cup Champions", sub: "Crowned Best House of the Year 2024" },
                    { title: "Star Performer", sub: "Individual Performance in Debate Competition" },
                    { title: "Sports Champion", sub: "Gold medal in Junior Football Tournament" },
                  ].map((t) => (
                    <li key={t.title} className={`flex items-start gap-3 ${R_EL} border border-gray-100 p-2.5`}>
                      <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" fill="#f5c518" strokeWidth={1.2} />
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-gray-900">{t.title}</div>
                        <div className="text-[11.5px] text-gray-500">{t.sub}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* Registration Info */}
            <Card>
              <div className="flex items-center justify-between px-7 pt-5">
                <h5 className="font-heading text-[15px] font-bold text-brand">Registration Info</h5>
                <SoftLink>View Details</SoftLink>
              </div>
              <ul className="space-y-2.5 px-7 pb-5 pt-3">
                <li className="flex items-center gap-2.5 text-[13.5px] text-gray-600"><CheckCircle2 className="h-4 w-4 text-green-600" /> Approved on <b className="ml-auto font-semibold text-gray-900">07 August 2023</b></li>
                <li className="flex items-center gap-2.5 text-[13.5px] text-gray-600"><UserCircle2 className="h-4 w-4 text-brand" /> Approved by <b className="ml-auto font-semibold text-gray-900">NNAWCA Admin</b></li>
                <li className="flex items-center gap-2.5 text-[13.5px] text-gray-600"><CalendarPlus className="h-4 w-4 text-blue-500" /> Profile updated on <b className="ml-auto font-semibold text-gray-900">15 October 2022</b></li>
              </ul>
            </Card>

            {/* Batchmates */}
            <Card>
              <div className="flex items-center justify-between px-7 pt-5">
                <h5 className="flex items-center gap-2 font-heading text-[15px] font-bold text-brand">
                  Batchmates
                  <span className="rounded-[6px] bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-500">{data.connectionsCount}</span>
                </h5>
                <button className="text-xs font-semibold text-brand hover:underline">See all Batchmates</button>
              </div>
              <div className="grid grid-cols-3 gap-2.5 px-7 pb-6 pt-3">
                {BATCHMATES.slice(0, 4).map((b) => (
                  <div key={b.name} className={`${R_EL} border border-gray-200 p-3 text-center`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.img} alt="" className="mx-auto h-[52px] w-[52px] rounded-full object-cover" />
                    <div className="my-2 text-xs font-semibold leading-tight text-gray-800">{b.name}</div>
                    <button className={`flex w-full items-center justify-center gap-1 ${R_EL} border border-brand bg-white px-2 py-1 text-[11px] font-semibold text-brand hover:bg-brand hover:text-white`}>
                      <UserPlus className="h-3 w-3" /> Connect
                    </button>
                  </div>
                ))}
              </div>
            </Card>
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
