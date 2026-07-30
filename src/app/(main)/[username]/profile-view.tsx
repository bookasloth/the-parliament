"use client"

import Link from "next/link"
import { useState } from "react"
import { UpgradePrompt } from "@/components/shared/UpgradePrompt"
import { AvatarUploader } from "@/components/shared/AvatarUploader"
import {
  Briefcase, MapPin, CalendarPlus, UserPlus, MoreHorizontal, Asterisk,
  ShieldCheck, Award, Droplet, Cake, Home, Users, Pencil, Share2,
  MessageSquare,
} from "lucide-react"

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
type Tab = "posts" | "about" | "connections"

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
                <div className="relative -mt-[62px] inline-block rounded-full bg-white p-[5px]" style={{ boxShadow: `0 0 0 4px ${msColor}` }}>
                  {data.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.photoUrl} alt={data.name} className="h-[118px] w-[118px] rounded-full object-cover" />
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
                  {data.connectionsCount} Connection{data.connectionsCount === 1 ? "" : "s"}
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
                    <button className={`${R_EL} flex items-center gap-1.5 border border-brand bg-white px-[18px] py-2.5 text-[13px] font-semibold text-brand hover:bg-brand hover:text-white transition-colors`}>
                      <UserPlus className="h-4 w-4" /> Connect
                    </button>
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
              {([["posts", "Posts"], ["about", "About"], ["connections", "Connections"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`border-b-[3px] px-4 py-3 text-sm font-semibold transition-colors ${tab === key ? "border-brand text-brand" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                >
                  {label}
                  {key === "posts" && data.postsCount > 0 && (
                    <span className="ml-1 rounded-[6px] bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">{data.postsCount}</span>
                  )}
                  {key === "connections" && data.connectionsCount > 0 && (
                    <span className="ml-1 rounded-[6px] bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-600">{data.connectionsCount}</span>
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

            {tab === "connections" && (
              <Card>
                <SectionTitle>Connections</SectionTitle>
                <div className="px-7 py-10 text-center">
                  <p className="text-sm text-gray-500">
                    {data.connectionsCount === 0
                      ? isOwn
                        ? "You have no connections yet."
                        : `${data.name.split(" ")[0]} has no connections yet.`
                      : `${data.connectionsCount} connection${data.connectionsCount === 1 ? "" : "s"}. Detail view coming soon.`}
                  </p>
                  {isOwn && (
                    <Link
                      href="/connections"
                      className={`mt-3 inline-flex items-center gap-1.5 ${R_EL} border border-brand bg-white px-4 py-2 text-xs font-semibold text-brand hover:bg-brand hover:text-white`}
                    >
                      Manage your connections
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
                {data.linkedinUrl && (
                  <a
                    href={data.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-brand hover:underline"
                  >
                    LinkedIn profile
                  </a>
                )}
                {Object.entries(data.socialLinks).map(([platform, url]) =>
                  url ? (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-brand hover:underline capitalize"
                    >
                      {platform}
                    </a>
                  ) : null,
                )}
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
