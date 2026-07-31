"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { UpgradePrompt } from "@/components/shared/UpgradePrompt"
import { AvatarUploader } from "@/components/shared/AvatarUploader"
import { FollowButton } from "@/components/shared/FollowButton"
import {
  Briefcase, MapPin, CalendarPlus, UserPlus, MoreHorizontal, Asterisk,
  ShieldCheck, Award, Droplet, Cake, Home, Users, Pencil, Share2,
  MessageSquare, Globe, Link as LinkIcon,
} from "lucide-react"

// Brand SVGs (lucide 1.17 doesn't ship brand icons). Simple Icons paths.
type Brand = (props: { className?: string }) => React.JSX.Element
const svgProps = {
  viewBox: "0 0 24 24",
  fill: "currentColor",
  xmlns: "http://www.w3.org/2000/svg",
} as const
const LinkedinIcon: Brand = ({ className }) => (
  <svg {...svgProps} className={className}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
)
const TwitterIcon: Brand = ({ className }) => (
  <svg {...svgProps} className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)
const InstagramIcon: Brand = ({ className }) => (
  <svg {...svgProps} className={className}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24s3.668-.014 4.948-.072c4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
)
const FacebookIcon: Brand = ({ className }) => (
  <svg {...svgProps} className={className}>
    <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 011.141.195v3.325a8.623 8.623 0 00-.653-.036 26.805 26.805 0 00-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 00-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
  </svg>
)
const YoutubeIcon: Brand = ({ className }) => (
  <svg {...svgProps} className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
)
const GithubIcon: Brand = ({ className }) => (
  <svg {...svgProps} className={className}>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
)

// ─────────────────────────────────────────────
// Props — real data assembled in load-profile.tsx
// ─────────────────────────────────────────────
export interface ExperienceItem {
  title: string
  company: string
  employmentType: string | null
  startLabel: string
  endLabel: string
  location: string | null
  locationType: string | null
  description: string | null
  skills: string[]
}

export interface ProfileViewData {
  username: string
  experiences: ExperienceItem[]
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
  followersCount: number
  followingCount: number
  postsCount: number
  userId: string
  viewerFollows: boolean
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

const R_CARD = "rounded-[6px]"
const R_EL = "rounded-[4px]"

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

// ─────────────────────────────────────────────
// Main view
// ─────────────────────────────────────────────
type Tab = "posts" | "about" | "followers"

export function ProfileView({ data, initialTab = "posts" }: { data: ProfileViewData; initialTab?: Tab }) {
  const [tab, setTabState] = useState<Tab>(initialTab)
  const setTab = (t: Tab) => {
    setTabState(t)
    if (typeof window !== "undefined") {
      const path = t === "posts" ? `/${data.username}` : `/${data.username}/${t}`
      window.history.replaceState(null, "", path)
    }
  }
  const [copied, setCopied] = useState(false)

  const isOwn = !!data.owner
  const houseColor = data.house?.color ?? "#1a3a6b"
  const msColor = MS_COLOR[data.membership.tier]
  const cover = data.coverUrl ?? DEFAULT_COVER

  const metaBits: { icon: React.ReactNode; text: string }[] = []
  if (data.profession) metaBits.push({ icon: <Briefcase className="h-4 w-4" />, text: data.profession })
  if (data.city) metaBits.push({ icon: <MapPin className="h-4 w-4" />, text: data.city })
  if (data.memberSince) metaBits.push({ icon: <CalendarPlus className="h-4 w-4" />, text: `NNAWCA member since ${data.memberSince}` })

  function shareProfile() {
    if (typeof window === "undefined") return
    const url = `${window.location.origin}/${data.username}`
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div className="min-h-screen bg-[#eef0f4] px-4 py-6 font-body">
      <div className="mx-auto max-w-[1200px]">

        {/* ===== HEADER + ABOUT SIDEBAR ===== */}
        <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <div className="relative h-[200px] bg-gray-200">
            <Image src={cover} alt="" className="h-full w-full object-cover" fill sizes="100vw" />
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
                <div className="relative -mt-[62px] inline-block rounded-full bg-white p-[5px]" style={{ boxShadow: `0 0 0 4px ${msColor}` }}>
                  {data.photoUrl ? (
                    <Image src={data.photoUrl} alt={data.name} className="h-[118px] w-[118px] rounded-full object-cover" width={118} height={118} />
                  ) : (
                    <div className="flex h-[118px] w-[118px] items-center justify-center rounded-full bg-brand-50 text-3xl font-bold text-brand-600">{data.initials}</div>
                  )}
                  {isOwn && <AvatarUploader />}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <h1 className="font-heading text-2xl font-extrabold tracking-tight text-gray-900">{data.name}</h1>
                  <Asterisk className="h-4 w-4" style={{ color: msColor }} aria-label={`${data.membership.label} member`} />
                  {data.isVerified && <ShieldCheck className="h-5 w-5 text-brand" aria-label="Verified" />}
                </div>
                {data.headline && <p className="mt-0.5 text-[13px] text-gray-700">{data.headline}</p>}
                <p className="mt-0.5 text-[13px] text-gray-500">
                  {data.followersCount} Follower{data.followersCount === 1 ? "" : "s"}
                  {" · "}
                  {data.followingCount} Following
                  {" · "}
                  {data.postsCount} Post{data.postsCount === 1 ? "" : "s"}
                </p>
              </div>

              {/* Header actions — owner sees Edit + Share; visitor sees Connect + Message + More */}
              <div className="flex items-center gap-2">
                {isOwn ? (
                  <>
                    <Link
                      href="/profile/edit"
                      className={`${R_EL} flex items-center gap-1.5 border border-brand bg-brand px-[18px] py-2.5 text-[13px] font-semibold text-white hover:bg-brand-600 transition-colors`}
                    >
                      <Pencil className="h-4 w-4" /> Edit profile
                    </Link>
                    <button
                      onClick={shareProfile}
                      className={`${R_EL} flex items-center gap-1.5 border border-gray-200 bg-white px-[14px] py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50`}
                    >
                      <Share2 className="h-4 w-4" /> {copied ? "Copied!" : "Share"}
                    </button>
                  </>
                ) : (
                  <>
                    <FollowButton userId={data.userId} initialFollowing={data.viewerFollows} />
                    <button className={`${R_EL} flex items-center gap-1.5 border border-gray-200 bg-white px-[14px] py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50`}>
                      <MessageSquare className="h-4 w-4" /> Message
                    </button>
                    <button className={`${R_EL} flex h-[42px] w-[42px] items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50`}>
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </>
                )}
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
              {([["posts", "Posts"], ["about", "About"], ["followers", "Followers"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`border-b-[3px] px-4 py-3 text-sm font-semibold transition-colors ${tab === key ? "border-brand text-brand" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                >
                  {label}
                  {key === "posts" && data.postsCount > 0 && (
                    <span className="ml-1 rounded-[6px] bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">{data.postsCount}</span>
                  )}
                  {key === "followers" && data.followersCount > 0 && (
                    <span className="ml-1 rounded-[6px] bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-600">{data.followersCount}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* About sidebar */}
        <Card className="lg:sticky lg:top-4">
          <div className="flex items-center justify-between px-7 pt-5 pb-1">
            <h5 className="font-heading text-[15px] font-bold text-gray-900">About {data.name.split(" ")[0]}</h5>
          </div>
          <div className="px-7 pb-6 pt-2">
            {data.bio && <p className="text-[13.5px] leading-relaxed text-gray-700">{data.bio}</p>}
            <ul className="mt-4 space-y-2.5 text-[13.5px] text-gray-700">
              {data.dateOfBirth && (
                <li className="flex items-center gap-2">
                  <Cake className="h-4 w-4 text-brand" /> DOB: <span className="font-semibold text-gray-900">{data.dateOfBirth}</span>
                </li>
              )}
              {data.bloodGroup && (
                <li className="flex items-center gap-2">
                  <Droplet className="h-4 w-4 text-brand" /> Blood Group: <span className="font-semibold text-gray-900">{data.bloodGroup}</span>
                </li>
              )}
              <li className="flex items-center gap-2">
                <Award className="h-4 w-4 text-brand" /> Membership: <span className="font-semibold text-gray-900">{data.membership.label}</span>
              </li>
              {data.house && (
                <li className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-brand" /> House: <span className="font-semibold text-gray-900">{data.house.name}</span>
                </li>
              )}
              {data.batchLabel && (
                <li className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-brand" /> Batch: <span className="font-semibold text-gray-900">{data.batchLabel}</span>
                </li>
              )}
            </ul>
          </div>
        </Card>

        </div>

        {/* ===== BODY ===== */}
        <div className="mt-[18px] grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[1.6fr_1fr]">

          <div className="flex flex-col gap-[18px]">
            {tab === "posts" && (
              <Card>
                <div className="px-7 py-10 text-center">
                  <p className="text-sm text-gray-500">
                    {isOwn ? "You haven't posted yet." : `${data.name.split(" ")[0]} hasn't posted yet.`}
                  </p>
                  {isOwn && (
                    <Link
                      href="/compose"
                      className={`mt-3 inline-flex items-center gap-1.5 ${R_EL} bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600`}
                    >
                      Write your first post
                    </Link>
                  )}
                </div>
              </Card>
            )}

            {tab === "about" && (
              <>
                {data.skills.length > 0 && (
                  <Card>
                    <SectionTitle>Skills</SectionTitle>
                    <div className="px-7 pb-6 pt-1 flex flex-wrap gap-2">
                      {data.skills.map((s) => <span key={s} className="rounded-[6px] bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">{s}</span>)}
                    </div>
                  </Card>
                )}

                <Card>
                  <SectionTitle>Experience</SectionTitle>
                  <div className="px-7 pb-6 pt-2 space-y-4">
                    {data.experiences.length === 0 && <p className="text-[13.5px] text-gray-500">No experience added yet.</p>}
                    {data.experiences.map((e, i) => (
                      <div key={i} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                        <div className="text-sm font-bold text-gray-900">{e.title}</div>
                        <div className="text-[13px] text-gray-600">
                          {e.company}
                          {e.employmentType && <span className="text-gray-400"> · {e.employmentType}</span>}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {e.startLabel} — {e.endLabel}
                        </div>
                        {(e.location || e.locationType) && (
                          <div className="text-xs text-gray-400">
                            {e.location}{e.location && e.locationType ? " · " : ""}{e.locationType}
                          </div>
                        )}
                        {e.description && <p className="mt-2 text-[13px] leading-relaxed text-gray-700">{e.description}</p>}
                        {e.skills.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {e.skills.map((s) => <span key={s} className="rounded-[4px] bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">{s}</span>)}
                          </div>
                        )}
                      </div>
                    ))}
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
              </>
            )}

            {tab === "followers" && (
              <Card>
                <SectionTitle>Followers</SectionTitle>
                <div className="px-7 py-10 text-center">
                  <p className="text-sm text-gray-500">
                    {data.followersCount === 0
                      ? isOwn
                        ? "You have no followers yet."
                        : `${data.name.split(" ")[0]} has no followers yet.`
                      : `${data.followersCount} follower${data.followersCount === 1 ? "" : "s"}. Detail view coming soon.`}
                  </p>
                  {isOwn && (
                    <Link
                      href="/connections"
                      className={`mt-3 inline-flex items-center gap-1.5 ${R_EL} border border-brand bg-white px-4 py-2 text-xs font-semibold text-brand hover:bg-brand hover:text-white`}
                    >
                      Manage your network
                    </Link>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* ===== RIGHT RAIL ===== */}
          <div className="flex flex-col gap-[18px]">
            <Card>
              <SectionTitle>Quick facts</SectionTitle>
              <div className="px-7 pb-6 pt-2 space-y-2 text-[13px] text-gray-700">
                {data.currentStatus && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-brand" />
                    <span className="capitalize">{data.currentStatus}</span>
                  </div>
                )}
                {data.homeTown && (
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-brand" />
                    Hometown: <span className="font-semibold text-gray-900">{data.homeTown}</span>
                  </div>
                )}
                {(() => {
                  const links: { key: string; href: string; label: string; Icon: Brand }[] = []
                  if (data.linkedinUrl) {
                    links.push({ key: "linkedin", href: data.linkedinUrl, label: "LinkedIn", Icon: LinkedinIcon })
                  }
                  for (const [platform, url] of Object.entries(data.socialLinks)) {
                    if (!url) continue
                    const p = platform.toLowerCase()
                    const Icon: Brand =
                      p === "linkedin" ? LinkedinIcon :
                      p === "twitter" || p === "x" ? TwitterIcon :
                      p === "instagram" ? InstagramIcon :
                      p === "facebook" ? FacebookIcon :
                      p === "youtube" ? YoutubeIcon :
                      p === "github" ? GithubIcon :
                      p === "website" || p === "web" || p === "site" ? (Globe as unknown as Brand) :
                      (LinkIcon as unknown as Brand)
                    links.push({ key: platform, href: url, label: platform, Icon })
                  }
                  if (links.length === 0) return null
                  return (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {links.map(({ key, href, label, Icon }) => (
                        <a
                          key={key}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={label}
                          title={label}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:border-brand hover:bg-brand hover:text-white transition-colors"
                        >
                          <Icon className="h-4 w-4" />
                        </a>
                      ))}
                    </div>
                  )
                })()}
                {!data.currentStatus && !data.homeTown && !data.linkedinUrl &&
                  Object.values(data.socialLinks).every((v) => !v) && (
                    <p className="text-gray-500">
                      {isOwn
                        ? "Add hometown, status, or social links from Edit profile."
                        : "No extra details shared."}
                    </p>
                  )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
