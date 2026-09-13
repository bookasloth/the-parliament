import { requireUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { getDefaultSchoolId } from "@/lib/school"
import { colorAvatar } from "@/lib/avatar"
import { NetworkClient } from "./network-client"
import { AdRail } from "@/components/shared/AdRail"
import { mutualCountsFor } from "@/modules/connections/service"
import { blockedIdsFor } from "@/modules/connections/blocks"
import { relativeTime } from "../feed/map-row"
import {
  chapters,
  type NetworkAlumni, type NetworkEvent, type ActivityEntry,
} from "./network-data"
import type { Membership } from "@/lib/homepage-data"

// Generic cover for events without a banner (unsplash host is allow-listed).
const EVENT_COVER_FALLBACK = "https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&h=400&fit=crop"

export const dynamic = "force-dynamic"

export default async function NetworkPage() {
  const sessionUser = await requireUser()
  const meId = sessionUser.id
  const schoolId = (await getDefaultSchoolId()) ?? undefined

  const [meUser, myFollows, followerCount, blocked] = await Promise.all([
    prisma.user.findUnique({
      where: { id: meId },
      select: {
        legalName: true, displayName: true, username: true, membershipStatus: true,
        profile: { select: { headline: true, profession: true, company: true, city: true, photoUrl: true, batch: { select: { label: true } } } },
      },
    }),
    prisma.follow.findMany({ where: { followerId: meId }, select: { followingId: true } }),
    prisma.follow.count({ where: { followingId: meId } }),
    blockedIdsFor(meId),
  ])

  // Exclude self, people already followed, and anyone in a block relationship
  // (audit: /network suggestions skipped the block filter the other paths apply).
  const excluded = new Set<string>([meId, ...myFollows.map((f) => f.followingId), ...blocked])

  const meBatch = meUser?.profile?.batch?.label ?? ""
  const meCity = meUser?.profile?.city ?? ""
  const meCompany = meUser?.profile?.company ?? ""

  const me = {
    name: meUser?.displayName || meUser?.legalName || "You",
    username: meUser?.username ?? "",
    headline: meUser?.profile?.headline || meUser?.profile?.profession || "",
    avatar: meUser?.profile?.photoUrl || colorAvatar(meId),
    followers: followerCount,
    following: myFollows.length,
  }

  const rows = await prisma.user.findMany({
    // memberType filter hides the NNAWCA/Vyapaar bot + system accounts from
    // "people to follow" (audit; matches the other suggestion paths).
    where: { status: "active", deletedAt: null, memberType: { notIn: ["bot", "system"] }, id: { notIn: [...excluded] }, ...(schoolId ? { schoolId } : {}) },
    orderBy: [{ isVerified: "desc" }, { createdAt: "desc" }],
    take: 48,
    select: {
      id: true, username: true, legalName: true, displayName: true, membershipStatus: true, isVerified: true,
      profile: { select: { headline: true, company: true, city: true, industry: true, photoUrl: true, house: { select: { name: true, colorHex: true } }, batch: { select: { label: true } } } },
    },
  })

  // Real mutual-connection counts (audit P1-18) instead of a hardcoded 0.
  const mutualCounts = await mutualCountsFor(meId, rows.map((u) => u.id))

  // ── Real "upcoming events" + "recent activity" (were mock) ─────────────────
  const [eventRows, newMembers, recentPosts] = await Promise.all([
    prisma.event.findMany({
      where: { status: "published", startsAt: { gte: new Date() }, ...(schoolId ? { schoolId } : {}) },
      orderBy: { startsAt: "asc" },
      take: 4,
      select: { id: true, title: true, startsAt: true, venue: true, mode: true, bannerUrl: true, priceInPaise: true, _count: { select: { rsvps: true } } },
    }),
    prisma.user.findMany({
      where: { status: "active", deletedAt: null, memberType: { notIn: ["bot", "system"] }, id: { not: meId }, ...(schoolId ? { schoolId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, username: true, displayName: true, legalName: true, createdAt: true, profile: { select: { photoUrl: true } } },
    }),
    prisma.post.findMany({
      where: { status: "visible", deletedAt: null, isAnonymous: false, ...(schoolId ? { schoolId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, createdAt: true, author: { select: { id: true, username: true, displayName: true, legalName: true, profile: { select: { photoUrl: true } } } } },
    }),
  ])

  const realEvents: NetworkEvent[] = eventRows.map((e) => ({
    id: e.id,
    slug: e.id, // event routes resolve by id (see modules/events/service)
    title: e.title,
    date: e.startsAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    location: e.mode === "online" ? "Online" : (e.venue || "To be announced"),
    cover: e.bannerUrl || EVENT_COVER_FALLBACK,
    interested: e._count.rsvps,
    isFree: e.priceInPaise <= 0,
    price: e.priceInPaise > 0 ? e.priceInPaise / 100 : undefined,
  }))

  // Merge new joins + new posts into one recency-sorted activity feed.
  const activityRaw: (ActivityEntry & { at: Date })[] = [
    ...newMembers.map((u) => ({
      id: `join-${u.id}`, name: u.displayName || u.legalName, username: u.username ?? "",
      avatar: u.profile?.photoUrl || colorAvatar(u.id),
      action: "joined the alumni network", when: relativeTime(u.createdAt), type: "join" as const,
      href: u.username ? `/${u.username}` : "/network", at: u.createdAt,
    })),
    ...recentPosts.map((p) => ({
      id: `post-${p.id}`, name: p.author.displayName || p.author.legalName, username: p.author.username ?? "",
      avatar: p.author.profile?.photoUrl || colorAvatar(p.author.id),
      action: "published a post", when: relativeTime(p.createdAt), type: "post" as const,
      href: `/feed/${p.id}`, at: p.createdAt,
    })),
  ]
  const realActivity: ActivityEntry[] = activityRaw
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6)
    .map(({ at: _at, ...rest }) => rest)

  const suggestedAlumni: NetworkAlumni[] = rows.map((u) => {
    const p = u.profile
    const batch = p?.batch?.label ?? ""
    const socialProof = batch && batch === meBatch ? "Same batch" : p?.city && p.city === meCity ? `Lives in ${p.city}` : p?.company && p.company === meCompany ? `Works at ${p.company}` : "Suggested for you"
    return {
      id: u.username ?? u.id,
      userId: u.id,
      name: u.displayName || u.legalName,
      username: u.username ?? "",
      batch,
      batchLabel: batch ? `Batch ${batch}` : "Alumni",
      house: p?.house?.name ?? "",
      membership: (u.membershipStatus as Membership) ?? "student",
      verified: u.isVerified,
      headline: p?.headline ?? "",
      company: p?.company ?? undefined,
      city: p?.city ?? undefined,
      industry: p?.industry ?? undefined,
      avatar: p?.photoUrl || colorAvatar(u.id),
      mutualCount: mutualCounts.get(u.id) ?? 0,
      socialProof,
    }
  })

  return (
    <NetworkClient
      me={me}
      meBatch={meBatch}
      meCity={meCity}
      meCompany={meCompany}
      suggestedAlumni={suggestedAlumni}
      recentActivity={realActivity}
      suggestedEvents={realEvents}
      chapters={chapters}
      adRail={<AdRail set="content" />}
    />
  )
}
