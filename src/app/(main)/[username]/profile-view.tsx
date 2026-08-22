"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { UpgradePrompt } from "@/components/shared/UpgradePrompt"
import { AvatarUploader } from "@/components/shared/AvatarUploader"
import { FollowButton } from "@/components/shared/FollowButton"
import type { FeedPost } from "@/components/shared/FeedCard"
import { ProfileTimeline } from "./profile-timeline"
import PostCard from "@/app/(main)/feed/[postId]/post-card"
import type { FeedCursor } from "@/modules/feed/query"

/** One rendered post in a profile timeline. */
export type ProfileTimelinePost = { post: FeedPost; isAuthor: boolean; initialSaved: boolean }
import { startConversationAction } from "../messages/actions"
import { throwEggAction } from "../feed/egg-actions"
import {
  Briefcase, MapPin, Building2, MoreHorizontal,
  Award, Droplet, Cake, Home, Users, Pencil, Share2,
  MessageSquare, Link as LinkIcon,
  LayoutGrid, Tag, Info,
} from "lucide-react"
import { VerifiedTick } from "@/components/shared/VerifiedTick"
import { VerifiedBadge } from "@/components/shared/VerifiedBadge"
import { AchievementsPanel, type AchievementBadge } from "@/components/shared/AchievementsPanel"
import { Card, SectionTitle, SocialLinks, R_EL } from "@/components/shared/profile-kit"

// ─────────────────────────────────────────────
// Props — real data assembled in load-profile.tsx
// ─────────────────────────────────────────────
export interface ExperienceItem {
  title: string
  company: string
  employmentType: string | null
  startLabel: string
  endLabel: string
  duration: string
  location: string | null
  locationType: string | null
  description: string | null
  skills: string[]
}

export interface EducationItem {
  school: string
  degree: string | null
  fieldOfStudy: string | null
  startYear: number | null
  endYear: number | null
}

export interface ProfileViewData {
  username: string
  experiences: ExperienceItem[]
  educations: EducationItem[]
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
  posts: ProfileTimelinePost[]
  /** Keyset cursor for the next timeline page (null = no more / not paginated). */
  postsNextCursor: FeedCursor | null
  tagged: ProfileTimelinePost[]
  taggedCount: number
  followers: {
    userId: string
    username: string | null
    name: string
    avatar: string
    batchLabel: string
    houseColor: string | null
    isVerified: boolean
    membership: string
    isSelf: boolean
    viewerFollows: boolean
  }[]
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
  badges: AchievementBadge[]
  totalBadges: number
  karma: number
  eggs: number
  shells: number
  viewerMembershipTier: ProfileViewData["membership"]["tier"] | null
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

// ─────────────────────────────────────────────
// Main view
// ─────────────────────────────────────────────
type Tab = "posts" | "tagged" | "about" | "followers"

export function ProfileView({ data, initialTab = "posts" }: { data: ProfileViewData; initialTab?: Tab }) {
  const router = useRouter()
  const [tab, setTabState] = useState<Tab>(initialTab)
  const setTab = (t: Tab) => {
    setTabState(t)
    if (typeof window !== "undefined") {
      const path = t === "posts" ? `/${data.username}` : `/${data.username}/${t}`
      window.history.replaceState(null, "", path)
    }
  }
  const [copied, setCopied] = useState(false)
  const [messagingLoading, setMessagingLoading] = useState(false)
  const [eggThrowing, setEggThrowing] = useState(false)
  const [eggMsg, setEggMsg] = useState<string | null>(null)

  const isOwn = !!data.owner
  const houseColor = data.house?.color ?? "#1a3a6b"
  const msColor = MS_COLOR[data.membership.tier]
  const cover = data.coverUrl ?? DEFAULT_COVER

  const metaBits: { icon: React.ReactNode; text: string }[] = []
  if (data.profession) metaBits.push({ icon: <Briefcase className="h-4 w-4" />, text: data.profession })
  if (data.company) metaBits.push({ icon: <Building2 className="h-4 w-4" />, text: data.company })
  if (data.city) metaBits.push({ icon: <MapPin className="h-4 w-4" />, text: data.city })

  function shareProfile() {
    if (typeof window === "undefined") return
    const url = `${window.location.origin}/${data.username}`
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  async function openConversation() {
    setMessagingLoading(true)
    try {
      const r = await startConversationAction(data.userId)
      if (r.ok) {
        router.push(`/messages/${r.conversationId}`)
      } else {
        alert(r.error)
      }
    } catch (err) {
      alert("Failed to start conversation")
    } finally {
      setMessagingLoading(false)
    }
  }

  async function handleThrowEgg() {
    setEggThrowing(true)
    setEggMsg(null)
    try {
      const r = await throwEggAction(data.userId)
      setEggMsg(r.ok ? "🥚 Egg thrown!" : r.error)
    } catch {
      setEggMsg("Failed to throw egg")
    } finally {
      setEggThrowing(false)
      setTimeout(() => setEggMsg(null), 3000)
    }
  }

  // Shared header pieces — reused by the mobile (centred) and desktop (one-line) layouts.
  const avatarInner = (
    <div className="w-fit rounded-[3px] bg-white p-[5px]" style={{ boxShadow: `0 0 0 4px ${msColor}` }}>
      <div className="relative">
        {data.photoUrl ? (
          <Image src={data.photoUrl} alt={data.name} className="h-[118px] w-[118px] rounded-[4px] object-cover" width={118} height={118} />
        ) : (
          <div className="flex h-[118px] w-[118px] items-center justify-center rounded-[3px] bg-brand-50 text-3xl font-bold text-brand-600">{data.initials}</div>
        )}
        {isOwn && <AvatarUploader />}
      </div>
    </div>
  )

  const nameTick = (
    <div className="flex min-w-0 items-center gap-1.5">
      <h1 className="truncate font-heading text-xl font-extrabold tracking-tight text-gray-900">{data.name}</h1>
      {data.isVerified && (
        <VerifiedBadge
          size={20}
          membership={data.membership.tier}
          membershipLabel={data.membership.label}
          verifiedOn={data.verifiedOn}
        />
      )}
    </div>
  )

  // ponytail: Copy link + native share work with no backend; Report/Block
  // deferred until a profile-report action exists.
  const moreMenu = <MoreMenu username={data.username} />

  const actions = isOwn ? (
    <>
      <Link
        href="/profile/edit"
        className={`${R_EL} flex items-center gap-1.5 border border-brand bg-brand px-[18px] py-2.5 text-[13px] font-semibold text-white hover:bg-brand-600 transition-colors`}
      >
        <Pencil className="h-4 w-4" /> Edit
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
      <FollowButton userId={data.userId} initialFollowing={data.viewerFollows} iconOnly />
      <button
        onClick={openConversation}
        disabled={messagingLoading}
        aria-label={messagingLoading ? "Starting…" : "Message"}
        title="Message"
        className={`${R_EL} flex h-11 w-11 items-center justify-center border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <MessageSquare className="h-5 w-5" />
      </button>
      <button
        onClick={handleThrowEgg}
        disabled={eggThrowing}
        aria-label="Throw Egg"
        title="Throw an egg 🥚"
        className={`${R_EL} flex h-11 w-11 items-center justify-center border border-amber-200 text-amber-600 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className="text-lg">🥚</span>
      </button>
      {moreMenu}
    </>
  )

  // Mobile: icon-only action row (square 44px touch targets).
  const ICON_BTN = `${R_EL} flex h-11 w-11 items-center justify-center border border-gray-200 text-gray-600 hover:bg-gray-50`
  const actionsCompact = isOwn ? (
    <>
      <Link href="/profile/edit" aria-label="Edit profile" title="Edit profile" className={`${R_EL} flex h-11 w-11 items-center justify-center border border-brand bg-brand text-white hover:bg-brand-600`}>
        <Pencil className="h-5 w-5" />
      </Link>
      <button onClick={shareProfile} aria-label={copied ? "Copied!" : "Share"} title={copied ? "Copied!" : "Share"} className={ICON_BTN}>
        <Share2 className="h-5 w-5" />
      </button>
    </>
  ) : (
    <>
      <FollowButton userId={data.userId} initialFollowing={data.viewerFollows} iconOnly />
      <button onClick={openConversation} disabled={messagingLoading} aria-label="Message" title="Message" className={`${ICON_BTN} disabled:opacity-50 disabled:cursor-not-allowed`}>
        <MessageSquare className="h-5 w-5" />
      </button>
      <button onClick={handleThrowEgg} disabled={eggThrowing} aria-label="Throw Egg" title="Throw an egg 🥚" className={`${ICON_BTN} !border-amber-200 !text-amber-600 hover:!bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed`}>
        <span className="text-lg">🥚</span>
      </button>
      {moreMenu}
    </>
  )

  const metaRow = metaBits.length > 0 && (
    <>
      {metaBits.map((m, i) => (
        <span key={i} className="flex items-center gap-1.5"><span className="text-brand">{m.icon}</span>{m.text}</span>
      ))}
    </>
  )

  return (
    <div className="min-h-screen bg-[#eef0f4] px-4 py-6 font-body">
      <div className="mx-auto max-w-[1300px]">

        {/* ===== HEADER + ABOUT SIDEBAR ===== */}
        <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[1.6fr_1fr]">
        {/* Left column: header card + body content stacked with no grid-row gap */}
        <div className="flex flex-col gap-[18px]">
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
            {/* MOBILE: centred hero */}
            <div className="text-center lg:hidden">
              <div className="-mt-[62px] flex justify-center">{avatarInner}</div>
              <div className="mt-3 flex justify-center">{nameTick}</div>
              {data.headline && <p className="mx-auto mt-1 max-w-[560px] truncate text-[13.5px] text-gray-600">{data.headline}</p>}
              <div className="mt-4 flex items-center justify-center gap-2.5">{actionsCompact}</div>
              {eggMsg && <p className="mt-2 text-center text-xs font-medium text-amber-600">{eggMsg}</p>}
              {metaRow && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-[18px] gap-y-1.5 border-t border-gray-100 pt-3 text-[13px] text-gray-600">{metaRow}</div>
              )}
            </div>

            {/* DESKTOP: avatar · (name over headline) · actions */}
            <div className="hidden lg:block">
              <div className="flex items-end gap-4">
                <div className="-mt-[62px] shrink-0">{avatarInner}</div>
                <div className="flex min-w-0 flex-1 items-end justify-between gap-2 pb-2">
                  <div className="min-w-0">
                    {nameTick}
                    {data.headline && <p className="mt-1 truncate text-[13.5px] text-gray-700">{data.headline}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">{actions}</div>
                  {eggMsg && <p className="mt-1 text-right text-xs font-medium text-amber-600">{eggMsg}</p>}
                </div>
              </div>
              {metaRow && (
                <div className="mt-3 flex flex-wrap items-center gap-x-[18px] gap-y-1.5 border-t border-gray-100 pt-3 text-[13px] text-gray-600">{metaRow}</div>
              )}
            </div>

            {/* tabs — centred on mobile, left on desktop */}
            <div className="mt-3 flex justify-center gap-1.5 border-t border-gray-100 px-1 pt-1.5 lg:justify-start">
              {([["posts", "Posts", LayoutGrid], ["tagged", "Tagged", Tag], ["about", "About", Info], ["followers", "Followers", Users]] as const).map(([key, label, Icon]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  aria-label={label}
                  className={`flex items-center border-b-[3px] px-4 py-3 text-sm font-semibold transition-colors ${tab === key ? "border-brand text-brand" : "border-transparent text-gray-400 hover:text-gray-600"}`}
                >
                  {/* mobile: icon only; desktop: text label (count stays on both) */}
                  <Icon className="h-[18px] w-[18px] lg:hidden" />
                  <span className="hidden lg:inline">{label}</span>
                  {key === "posts" && data.postsCount > 0 && (
                    <span className="ml-1 rounded-[5px] bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">{data.postsCount}</span>
                  )}
                  {key === "tagged" && data.taggedCount > 0 && (
                    <span className="ml-1 rounded-[5px] bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-600">{data.taggedCount}</span>
                  )}
                  {key === "followers" && data.followersCount > 0 && (
                    <span className="ml-1 rounded-[5px] bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-600">{data.followersCount}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </Card>

          {/* ===== BODY — tab content, still in left column ===== */}
          <div className="flex min-w-0 flex-col gap-[18px]">
            {tab === "posts" && (
              <ProfileTimeline
                userId={data.userId}
                initialPosts={data.posts}
                initialCursor={data.postsNextCursor}
                isOwn={isOwn}
                avatar={data.photoUrl ?? undefined}
                emptyName={data.name.split(" ")[0]}
              />
            )}

            {tab === "tagged" && (
              <div className="flex flex-col gap-4">
                {data.tagged.length === 0 ? (
                  <Card>
                    <div className="px-7 py-12 text-center text-sm text-gray-400">
                      No tagged posts yet.
                    </div>
                  </Card>
                ) : (
                  data.tagged.map(({ post, isAuthor, initialSaved }) => (
                    <PostCard key={post.id} post={post} isAuthor={isAuthor} initialSaved={initialSaved} />
                  ))
                )}
              </div>
            )}

            {tab === "about" && (
              <>
                {data.bio && (
                  <Card>
                    <SectionTitle>Bio</SectionTitle>
                    <div className="px-7 pb-6 pt-1">
                      <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-gray-700">{data.bio}</p>
                    </div>
                  </Card>
                )}
                <SocialLinks linkedinUrl={data.linkedinUrl} socialLinks={data.socialLinks} />
                {data.skills.length > 0 && (
                  <Card>
                    <SectionTitle>Skills</SectionTitle>
                    <div className="px-7 pb-6 pt-1 flex flex-wrap gap-2">
                      {data.skills.map((s) => <span key={s} className="rounded-[5px] bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">{s}</span>)}
                    </div>
                  </Card>
                )}

                <Card>
                  <SectionTitle>Experience</SectionTitle>
                  <div className="px-7 pb-6 pt-2">
                    {data.experiences.length === 0 && <p className="text-[13.5px] text-gray-500">No experience added yet.</p>}
                    {data.experiences.map((e, i) => (
                      <div key={i} className="flex gap-3.5 border-b border-gray-100 py-4 first:pt-0 last:border-b-0 last:pb-0">
                        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[4px] bg-gray-100 text-sm font-bold text-gray-500 ring-1 ring-gray-200">
                          {e.company.trim().charAt(0).toUpperCase() || "?"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[14px] leading-tight text-gray-900">
                            <span className="font-bold">{e.title}</span>
                            <span className="text-gray-500"> · </span>
                            <span className="text-gray-700">{e.company}</span>
                            {e.employmentType && <span className="text-gray-500"> · {e.employmentType}</span>}
                          </div>
                          <div className="mt-0.5 text-xs text-gray-500">
                            {e.startLabel} – {e.endLabel}{e.duration && ` · ${e.duration}`}
                            {(e.location || e.locationType) && (
                              <span className="text-gray-400">
                                {" || "}{e.location}{e.location && e.locationType ? " · " : ""}{e.locationType}
                              </span>
                            )}
                          </div>
                          {e.description && <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-gray-600">{e.description}</p>}
                          {e.skills.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {e.skills.map((s) => <span key={s} className="rounded-[4px] bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">{s}</span>)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <SectionTitle>Education</SectionTitle>
                  <div className="px-7 pb-6 pt-2">
                    {data.educations.map((e, i) => (
                      <div key={i} className="flex gap-3.5 border-b border-gray-100 py-4 first:pt-0">
                        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[4px] bg-gray-100 text-sm font-bold text-gray-500 ring-1 ring-gray-200">
                          {e.school.trim().charAt(0).toUpperCase() || "?"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[15px] font-bold leading-tight text-gray-900">{e.school}</div>
                          {(e.degree || e.fieldOfStudy) && (
                            <div className="text-[13px] text-gray-700">{[e.degree, e.fieldOfStudy].filter(Boolean).join(", ")}</div>
                          )}
                          {(e.startYear || e.endYear) && (
                            <div className="mt-0.5 text-xs text-gray-500">{[e.startYear, e.endYear].filter(Boolean).join(" – ")}</div>
                          )}
                        </div>
                      </div>
                    ))}
                    {/* Legacy single higher-education field, kept until migrated into entries. */}
                    {data.higherEducation && (
                      <div className="flex gap-3.5 border-b border-gray-100 py-4 first:pt-0">
                        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[4px] bg-gray-100 text-sm font-bold text-gray-500 ring-1 ring-gray-200">
                          {data.higherEducation.trim().charAt(0).toUpperCase() || "?"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[15px] font-bold leading-tight text-gray-900">{data.higherEducation}</div>
                          <div className="text-[13px] text-gray-500">Higher education</div>
                        </div>
                      </div>
                    )}
                    {/* JNV Nagpur — always shown, the shared anchor. */}
                    <div className="flex gap-3.5 py-4 first:pt-0">
                      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[4px] bg-gray-100 text-sm font-bold text-gray-500 ring-1 ring-gray-200">J</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-bold leading-tight text-gray-900">JNV Nagpur</div>
                        <div className="text-[13px] text-gray-700">{data.house ? `${data.house.name} House` : "Jawahar Navodaya Vidyalaya"}</div>
                        {data.batchLabel && <div className="mt-0.5 text-xs text-gray-500">{data.batchLabel}</div>}
                      </div>
                    </div>
                  </div>
                </Card>

                {data.owner && (
                  <Card>
                    <SectionTitle>Membership perks</SectionTitle>
                    <div className="space-y-3 px-7 pb-6 pt-2">
                      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
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
                      <div className="flex flex-col items-start gap-2 border-t border-gray-50 pt-3 sm:flex-row sm:items-center sm:gap-3">
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

            {tab === "followers" && (() => {
              const canSeeAll = isOwn || data.viewerMembershipTier === "life" || data.viewerMembershipTier === "committee"
              const MAX_PREVIEW = 10
              const visibleFollowers = canSeeAll ? data.followers : data.followers.slice(0, MAX_PREVIEW)
              const hiddenCount = canSeeAll ? 0 : Math.max(0, data.followersCount - MAX_PREVIEW)
              return (
              <Card>
                <SectionTitle>Followers</SectionTitle>
                {data.followers.length === 0 ? (
                  <div className="px-7 py-10 text-center">
                    <p className="text-sm text-gray-500">
                      {isOwn ? "You have no followers yet." : `${data.name.split(" ")[0]} has no followers yet.`}
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
                ) : (
                  <div className="divide-y divide-gray-100 px-5 pb-3">
                    {visibleFollowers.map((f) => (
                      <div key={f.userId} className="flex items-center gap-3 py-3">
                        <Link href={`/${f.username ?? f.userId}`} className="flex-shrink-0">
                          <Image
                            src={f.avatar}
                            alt={f.name}
                            width={44}
                            height={44}
                            className="h-11 w-11 rounded-[4px] object-cover"
                            style={{ boxShadow: f.houseColor ? `0 0 0 2px ${f.houseColor}` : undefined }}
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link href={`/${f.username ?? f.userId}`} className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-semibold text-gray-900 hover:text-brand">{f.name}</span>
                            {f.isVerified && <VerifiedTick size={14} membership={f.membership} />}
                          </Link>
                          {f.batchLabel && <p className="text-xs text-gray-500">{f.batchLabel}</p>}
                        </div>
                        {!f.isSelf && (
                          <FollowButton userId={f.userId} initialFollowing={f.viewerFollows} />
                        )}
                      </div>
                    ))}
                    {hiddenCount > 0 && (
                      <div className="py-4 text-center">
                        <p className="text-xs text-gray-500">+{hiddenCount} more followers</p>
                        <UpgradePrompt currentPlan={(data.viewerMembershipTier ?? "student") as import("@/config/membership").PlanCode} feature="Viewing all followers" compact />
                      </div>
                    )}
                  </div>
                )}
              </Card>
              )
            })()}
          </div>
        </div>{/* /left column */}

        {/* Right rail — About + Achievements */}
        <div className="flex flex-col gap-[18px] lg:sticky lg:top-4 lg:self-start lg:row-span-2">
          <Card>
            <div className="flex items-center justify-between px-7 pt-5 pb-1">
              <h5 className="font-heading text-[15px] font-bold text-gray-900">About {data.name.split(" ")[0]}</h5>
            </div>
            <div className="px-7 pb-6 pt-2">
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13.5px] text-gray-700">
                {data.dateOfBirth && (
                  <li className="flex items-center gap-2">
                    <Cake className="h-4 w-4 text-blue-500" /> DOB: <span className="font-semibold text-gray-900">{data.dateOfBirth}</span>
                  </li>
                )}
                {data.bloodGroup && (
                  <li className="flex items-center gap-2">
                    <Droplet className="h-4 w-4 text-rose-500" /> Blood Group: <span className="font-semibold text-gray-900">{data.bloodGroup}</span>
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" /> Membership: <span className="font-semibold text-gray-900">{data.membership.label}</span>
                </li>
                {data.house && (
                  <li className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-brand" /> House: <span className="font-semibold text-gray-900">{data.house.name}</span>
                  </li>
                )}
                {data.batchLabel && (
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-500" /> Batch: <span className="font-semibold text-gray-900">{data.batchLabel}</span>
                  </li>
                )}
                {data.currentStatus && (
                  <li className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-emerald-500" /> <span className="font-semibold capitalize text-gray-900">{data.currentStatus}</span>
                  </li>
                )}
                {data.homeTown && (
                  <li className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-teal-500" /> Hometown: <span className="font-semibold text-gray-900">{data.homeTown}</span>
                  </li>
                )}
              </ul>
            </div>
          </Card>
          <AchievementsPanel
            data={{
              ownerFirstName: data.name.split(" ")[0],
              userId: data.userId,
              badges: data.badges,
              totalBadges: data.totalBadges,
              eggs: data.eggs,
              shells: data.shells,
              karma: data.karma,
            }}
          />
        </div>
        </div>{/* /grid */}
      </div>
    </div>
  )
}

// Profile "More" dropdown — Copy link + native Share (no backend needed).
function MoreMenu({ username }: { username: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const url = typeof window !== "undefined" ? `${window.location.origin}/${username}` : `/${username}`

  function copyLink() {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
    setOpen(false)
  }
  function share() {
    if (typeof navigator !== "undefined" && navigator.share) navigator.share({ url }).catch(() => {})
    else copyLink()
    setOpen(false)
  }

  const item = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="More"
        title="More"
        className={`${R_EL} flex h-11 w-11 items-center justify-center border border-gray-200 text-gray-600 hover:bg-gray-50`}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden border border-gray-200 bg-white shadow-xl ${R_EL}`}>
            <button onClick={copyLink} className={item}>
              <LinkIcon className="h-4 w-4" /> {copied ? "Copied!" : "Copy profile link"}
            </button>
            <button onClick={share} className={item}>
              <Share2 className="h-4 w-4" /> Share profile
            </button>
          </div>
        </>
      )}
    </div>
  )
}
