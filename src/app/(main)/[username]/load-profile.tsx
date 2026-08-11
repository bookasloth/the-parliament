import { notFound } from "next/navigation"
import { after } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCurrent } from "@/modules/membership/service"
import { colorAvatar } from "@/lib/avatar"
import type { PlanCode } from "@/config/membership"
import { ProfileView, type ExperienceItem, type EducationItem, type ProfileViewData } from "./profile-view"
import { formatDuration } from "@/modules/profile/history"
import { getFeed } from "@/modules/feed/query"
import { mapRowToFeedPost, batchOrdinal, formatBatch, relativeTime } from "../feed/map-row"
import type { FeedMembership, BorderType } from "@/components/shared/feed-card/types"
import { getFollowingIds } from "@/modules/connections/service"
import { getBalance } from "@/modules/karma/ledger"
import { resolveProfilePrivacy, type ProfileVisibility } from "@/modules/profile/privacy"
import { RestrictedProfile } from "./restricted-profile"

function fmt(d: Date | null | undefined): string {
  if (!d) return "Present"
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export const VALID_TABS = ["posts", "tagged", "about", "followers"] as const
export type TabKey = (typeof VALID_TABS)[number]

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatDate(d: Date | null | undefined): string | null {
  if (!d) return null
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function resolveMembership(status: string): ProfileViewData["membership"] {
  switch (status) {
    case "life":
      return { label: "Life Member", tier: "life" }
    case "premium":
    case "active":
      return { label: "Premium", tier: "premium" }
    case "student":
      return { label: "Student", tier: "student" }
    case "associate":
      return { label: "Associate", tier: "associate" }
    case "committee":
      return { label: "Committee", tier: "committee" }
    default:
      return { label: "Student", tier: "student" }
  }
}

// Facebook model: /:username is canonical, but a bare /:id also resolves
// (the profile.php?id= fallback). id is a uuid column, so only match it by id
// when the param is uuid-shaped — otherwise Postgres rejects the cast.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function loadProfile(handle: string, initialTab: TabKey) {
  const session = await auth()
  const username = handle

  const user = await prisma.user.findFirst({
    where: UUID_RE.test(handle) ? { OR: [{ username: handle }, { id: handle }] } : { username: handle },
    select: {
      id: true,
      schoolId: true,
      legalName: true,
      displayName: true,
      username: true,
      memberType: true,
      currentStatus: true,
      gender: true,
      dateOfBirth: true,
      membershipStatus: true,
      isVerified: true,
      verifiedAt: true,
      verificationStatus: true,
      profileCompletion: true,
      createdAt: true,
      profile: {
        select: {
          photoUrl: true,
          coverUrl: true,
          bio: true,
          city: true,
          homeTown: true,
          correspondenceAddress: true,
          bloodGroup: true,
          profession: true,
          company: true,
          designation: true,
          higherEducation: true,
          skills: true,
          linkedinUrl: true,
          socialLinks: true,
          headline: true,
          visibility: true,
          contactAlwaysShare: true,
          house: { select: { name: true, colorHex: true } },
          batch: { select: { startYear: true, endYear: true, label: true } },
        },
      },
      _count: {
        select: {
          followers: true,
          following: true,
        },
      },
      userBadges: {
        orderBy: { awardedAt: "desc" },
        select: { badge: { select: { key: true, label: true, iconUrl: true } } },
      },
    },
  })

  if (!user) notFound()

  // Everything below depends only on the now-known user row, so fetch it all in
  // one round-trip batch instead of ~6 sequential hops (was ~300ms of serial
  // pooler latency on a top-traffic page).
  const viewerId = session?.user?.id
  const isOwnProfile = viewerId === user.id

  // ── Privacy gate (Profile.visibility) ──────────────────────────────────────
  // Enforce the whole-profile visibility BEFORE any heavy fetch or view-logging:
  // a viewer who can't see the profile gets a slim public-safe stub and we never
  // load — or send — the private payload. Field-level redaction (below) handles
  // the finer "member vs public vs owner" cut for viewers who ARE allowed in.
  const visibility = (user.profile?.visibility ?? "alumni") as ProfileVisibility
  const contactAlwaysShare = user.profile?.contactAlwaysShare ?? false

  // A connection check is only needed for `connections`-gated profiles.
  let isConnected = false
  if (!isOwnProfile && visibility === "connections" && viewerId) {
    isConnected =
      (await prisma.follow.findFirst({
        where: {
          OR: [
            { followerId: viewerId, followingId: user.id },
            { followerId: user.id, followingId: viewerId },
          ],
        },
        select: { id: true },
      })) !== null
  }

  const privacy = resolveProfilePrivacy({
    isOwner: isOwnProfile,
    isLoggedIn: !!viewerId,
    isConnected,
    visibility,
    contactAlwaysShare,
  })

  if (privacy.blocked) {
    const p0 = user.profile
    return (
      <RestrictedProfile
        reason={privacy.blocked}
        name={user.legalName}
        username={user.username ?? username}
        photoUrl={p0?.photoUrl || colorAvatar(user.id)}
        headline={p0?.headline ?? p0?.designation ?? p0?.profession ?? null}
        batchLabel={
          p0?.batch ? p0.batch.label || `${p0.batch.startYear}–${p0.batch.endYear}` : null
        }
        house={p0?.house ? { name: p0.house.name, color: p0.house.colorHex } : null}
        isVerified={user.isVerified}
      />
    )
  }

  // Record "who viewed your profile" (feeds the weekly re-engagement email).
  // Fire-and-forget past the response so it never slows the profile render; one
  // row per (profile, viewer), bumped on repeat visits. Skips self-views.
  if (viewerId && !isOwnProfile) {
    const targetId = user.id
    after(() =>
      prisma.profileView
        .upsert({
          where: { profileUserId_viewerId: { profileUserId: targetId, viewerId } },
          create: { profileUserId: targetId, viewerId },
          update: { count: { increment: 1 }, lastViewedAt: new Date() },
        })
        .catch(() => {}),
    )
  }
  const [experiences, educations, feed, [followerRows, viewerFollowing], postsCount, karma, viewerFollowsRow, current, taggedMentions] =
    await Promise.all([
      prisma.experience.findMany({
        where: { userId: user.id },
        orderBy: [{ sortOrder: "asc" }, { startDate: "desc" }],
      }),
      prisma.education.findMany({
        where: { userId: user.id },
        orderBy: [{ sortOrder: "asc" }, { endYear: "desc" }],
      }),
      user.schoolId
        ? getFeed({ schoolId: user.schoolId, authorId: user.id, viewerId, pageSize: 20, rankerName: "recency" })
        : Promise.resolve({ rows: [] as Awaited<ReturnType<typeof getFeed>>["rows"], nextCursor: null }),
      Promise.all([
        prisma.follow.findMany({
          where: { followingId: user.id },
          orderBy: { createdAt: "desc" },
          take: 60,
          select: {
            follower: {
              select: {
                id: true,
                username: true,
                displayName: true,
                legalName: true,
                isVerified: true,
                membershipStatus: true,
                profile: {
                  select: {
                    photoUrl: true,
                    house: { select: { name: true, colorHex: true } },
                    batch: { select: { label: true, startYear: true } },
                  },
                },
              },
            },
          },
        }),
        viewerId ? getFollowingIds(viewerId) : Promise.resolve(new Set<string>()),
      ]),
      prisma.post.count({ where: { authorId: user.id, deletedAt: null, status: "visible" } }),
      getBalance(user.id),
      !isOwnProfile && viewerId
        ? prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
            select: { id: true },
          })
        : Promise.resolve(null),
      isOwnProfile ? getCurrent(user.id) : Promise.resolve(null),
      prisma.postMention.findMany({
        where: { userId: user.id },
        orderBy: { post: { createdAt: "desc" } },
        take: 30,
        select: {
          post: {
            select: {
              id: true, body: true, media: true, status: true,
              createdAt: true, deletedAt: true,
              upvoteCount: true, downvoteCount: true, commentCount: true, shareCount: true,
              author: {
                select: {
                  id: true, username: true, legalName: true, displayName: true,
                  isVerified: true, membershipStatus: true,
                  profile: {
                    select: {
                      photoUrl: true,
                      headline: true,
                      house: { select: { name: true, colorHex: true } },
                      batch: { select: { startYear: true, endYear: true, label: true } },
                    },
                  },
                },
              },
              poll: { select: { id: true, question: true, expiresAt: true, options: { select: { id: true, label: true, voteCount: true }, orderBy: { sortOrder: "asc" } } } },
              group: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ])

  const experienceItems: ExperienceItem[] = experiences.map((e) => ({
    title: e.title,
    company: e.company,
    employmentType: e.employmentType,
    startLabel: fmt(e.startDate),
    endLabel: fmt(e.endDate),
    duration: formatDuration(e.startDate, e.endDate),
    location: e.location,
    locationType: e.locationType,
    description: e.description,
    skills: Array.isArray(e.skills) ? (e.skills as string[]) : [],
  }))

  const educationItems: EducationItem[] = educations.map((e) => ({
    school: e.school,
    degree: e.degree,
    fieldOfStudy: e.fieldOfStudy,
    startYear: e.startYear,
    endYear: e.endYear,
  }))

  // Timeline posts (visible only), rendered with the same FeedCard as the feed.
  const posts: ProfileViewData["posts"] = feed.rows.map((r) => {
    const post = mapRowToFeedPost(r)
    return { post, isAuthor: viewerId === post.authorId, initialSaved: post.savedByViewer ?? false }
  })
  // Followers list (people who follow THIS profile) + the viewer's own follow
  // set so each row's Follow button hydrates correctly.
  const followers: ProfileViewData["followers"] = followerRows.map(({ follower: f }) => ({
    userId: f.id,
    username: f.username,
    name: f.displayName || f.legalName,
    avatar: f.profile?.photoUrl || colorAvatar(f.id),
    batchLabel: batchOrdinal(f.profile?.batch?.startYear)
      ? `${batchOrdinal(f.profile?.batch?.startYear)} Batch`
      : (f.profile?.batch?.label ?? ""),
    houseColor: f.profile?.house?.colorHex ?? null,
    isVerified: f.isVerified,
    membership: f.membershipStatus,
    isSelf: f.id === viewerId,
    viewerFollows: viewerFollowing.has(f.id),
  }))

  const BORDER_MAP: Record<string, BorderType> = {
    premium: "darkBlue", life: "gold", student: "green", associate: "blue", inactive: "grey", committee: "rgby",
  }
  const tagged: ProfileViewData["tagged"] = (taggedMentions as any[])
    .filter((m) => m.post && !m.post.deletedAt && m.post.status === "visible")
    .map((m) => {
      const pt = m.post
      const a = pt.author
      const ms = (["associate","student","premium","life","inactive","committee"].includes(a.membershipStatus) ? a.membershipStatus : "associate") as FeedMembership
      const post = {
        id: pt.id,
        authorId: a.id,
        username: a.username ?? undefined,
        name: a.displayName || a.legalName,
        headline: a.profile?.headline ?? "",
        batch: formatBatch(a.profile?.batch),
        house: a.profile?.house ? { name: a.profile.house.name, color: a.profile.house.colorHex } : undefined,
        membership: ms,
        timestamp: relativeTime(pt.createdAt),
        isVerified: a.isVerified,
        content: pt.body ?? undefined,
        poll: pt.poll ? {
          id: pt.poll.id,
          question: pt.poll.question,
          options: pt.poll.options.map((o: { id: string; label: string; voteCount: number }) => ({ id: o.id, label: o.label, votes: o.voteCount })),
          totalVotes: pt.poll.options.reduce((s: number, o: { voteCount: number }) => s + o.voteCount, 0),
        } : undefined,
        upvotes: pt.upvoteCount,
        downvotes: pt.downvoteCount,
        comments: pt.commentCount,
        shares: pt.shareCount,
        avatar: a.profile?.photoUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(a.displayName || a.legalName)}`,
        borderType: BORDER_MAP[ms] ?? "blue",
      }
      return { post, isAuthor: viewerId === a.id, initialSaved: false }
    })

  const p = user.profile
  const batch = p?.batch
  const membership = resolveMembership(user.membershipStatus)
  const gradYear = batch?.endYear ?? null
  const yearsSince = gradYear ? new Date().getFullYear() - gradYear : null
  const social = (p?.socialLinks ?? {}) as Record<string, string>

  const viewerFollows = viewerFollowsRow !== null
  const owner: ProfileViewData["owner"] = current
    ? {
        planCode: current.planCode as PlanCode,
        canListBusiness: current.benefits.businessListing,
        canApplyMentor: current.benefits.mentorApply,
      }
    : null

  const data: ProfileViewData = {
    username: user.username ?? username,
    experiences: experienceItems,
    educations: educationItems,
    name: user.legalName,
    initials: user.legalName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
    photoUrl: p?.photoUrl || colorAvatar(user.id),
    coverUrl: p?.coverUrl ?? null,
    headline: p?.headline ?? p?.designation ?? p?.profession ?? null,
    profession: p?.profession ?? null,
    company: p?.company ?? null,
    // ── Field-level redaction (server-side; nulled fields never reach the
    //    client). Member fields need a logged-in viewer; contact needs the
    //    owner's opt-in; DOB + blood group are owner-only-hard. ──
    city: privacy.canSeeMemberFields ? (p?.city ?? null) : null,
    homeTown: privacy.canSeeMemberFields ? (p?.homeTown ?? null) : null,
    correspondenceAddress: privacy.canSeeContact ? (p?.correspondenceAddress ?? null) : null,
    bloodGroup: isOwnProfile ? (p?.bloodGroup ?? null) : null,
    bio: p?.bio ?? null,
    house: p?.house ? { name: p.house.name, color: p.house.colorHex } : null,
    batchLabel: batch ? batch.label || `${batch.startYear}–${batch.endYear}` : null,
    yearsSince,
    memberSince: formatDate(user.verifiedAt ?? user.createdAt),
    dateOfBirth: isOwnProfile ? formatDate(user.dateOfBirth) : null,
    gender: privacy.canSeeMemberFields ? (user.gender ?? null) : null,
    currentStatus: privacy.canSeeMemberFields ? (user.currentStatus ?? null) : null,
    membership,
    isVerified: user.isVerified,
    verificationStatus: user.verificationStatus,
    verifiedOn: formatDate(user.verifiedAt),
    profileCompletion: user.profileCompletion,
    followersCount: user._count.followers,
    followingCount: user._count.following,
    postsCount,
    posts,
    postsNextCursor: feed.nextCursor,
    tagged,
    taggedCount: tagged.length,
    followers,
    userId: user.id,
    viewerFollows,
    higherEducation: p?.higherEducation ?? null,
    skills: Array.isArray(p?.skills) ? (p?.skills as string[]) : [],
    linkedinUrl: p?.linkedinUrl ?? null,
    socialLinks: social,
    owner,
    badges: user.userBadges.map((ub) => ub.badge),
    totalBadges: user.userBadges.length,
    karma: Math.round(karma.balance),
    eggs: 0, // ponytail: no eggs currency model yet — wire the real count here when one exists
    viewerMembershipTier: session?.user?.membershipStatus
      ? resolveMembership(session.user.membershipStatus).tier
      : null,
  }

  return <ProfileView data={data} initialTab={initialTab} />
}
