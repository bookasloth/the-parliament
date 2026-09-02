import { prisma } from "@/lib/prisma"
import { blockedIdsFor } from "@/modules/connections/blocks"
import { searchDirectory, type DirectoryRow } from "@/modules/directory/service"

// Unified search (audit P1-1). Before this, the navbar offered five scopes and
// only "people" actually searched — the other four silently rendered the
// unfiltered page. This backs all of them with one privacy- and block-aware
// service over trigram-indexed ILIKE.

export type SearchScope = "all" | "people" | "posts" | "groups" | "events" | "businesses" | "hashtags"

export const SEARCH_SCOPES: readonly SearchScope[] = [
  "all", "people", "posts", "groups", "events", "businesses", "hashtags",
] as const

export function isSearchScope(v: string | null | undefined): v is SearchScope {
  return !!v && (SEARCH_SCOPES as readonly string[]).includes(v)
}

export interface PersonResult {
  id: string
  username: string | null
  name: string
  headline: string | null
  photoUrl: string | null
  href: string
}
export interface PostResult {
  id: string
  snippet: string
  authorName: string
  createdAt: Date
  href: string
}
export interface GroupResult { id: string; name: string; description: string | null; memberCount: number; href: string }
export interface EventResult { id: string; title: string; startsAt: Date; href: string }
export interface BusinessResult { id: string; name: string; tagline: string | null; slug: string; href: string }
export interface HashtagResult { tag: string; useCount: number; href: string }

export interface SearchResults {
  query: string
  scope: SearchScope
  people: PersonResult[]
  posts: PostResult[]
  groups: GroupResult[]
  events: EventResult[]
  businesses: BusinessResult[]
  hashtags: HashtagResult[]
}

const empty = (query: string, scope: SearchScope): SearchResults => ({
  query, scope, people: [], posts: [], groups: [], events: [], businesses: [], hashtags: [],
})

/** How many rows per type: a wider list when a single scope is selected. */
function limitFor(scope: SearchScope, type: SearchScope): number {
  if (scope === "all") return 6
  return scope === type ? 30 : 0
}

async function searchPeople(q: string, schoolId: string | undefined, viewerId: string, limit: number): Promise<PersonResult[]> {
  if (limit === 0) return []
  const { rows } = await searchDirectory({ schoolId, viewerId, q }, { page: 1, pageSize: limit })
  return rows.map((r: DirectoryRow) => ({
    id: r.id,
    username: r.username,
    name: r.displayName || r.legalName,
    headline: r.headline ?? r.profession ?? null,
    photoUrl: r.photoUrl,
    href: r.username ? `/${r.username}` : `/${r.id}`,
  }))
}

async function searchPosts(q: string, schoolId: string, blocked: Set<string>, limit: number): Promise<PostResult[]> {
  if (limit === 0) return []
  const rows = await prisma.post.findMany({
    where: {
      schoolId,
      deletedAt: null,
      status: "visible",
      isAnonymous: false, // never surface an anonymous author's post under their name
      // Only publicly-scoped posts are searchable — followers/groups-only posts
      // stay private (audit P0-3 alignment).
      visibilityScope: { notIn: ["followers", "groups"] },
      body: { contains: q, mode: "insensitive" },
      ...(blocked.size ? { authorId: { notIn: [...blocked] } } : {}),
    },
    orderBy: [{ rankingScore: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true, body: true, createdAt: true,
      author: { select: { displayName: true, legalName: true } },
    },
  })
  return rows.map((p) => ({
    id: p.id,
    snippet: (p.body ?? "").slice(0, 160),
    authorName: p.author.displayName || p.author.legalName,
    createdAt: p.createdAt,
    href: `/feed/${p.id}`,
  }))
}

async function searchGroups(q: string, schoolId: string, limit: number): Promise<GroupResult[]> {
  if (limit === 0) return []
  const rows = await prisma.group.findMany({
    where: {
      schoolId,
      visibility: "public", // private groups don't surface in global search
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    },
    take: limit,
    select: { id: true, name: true, description: true, _count: { select: { members: { where: { status: "active" } } } } },
  })
  return rows.map((g) => ({ id: g.id, name: g.name, description: g.description, memberCount: g._count.members, href: `/groups/${g.id}` }))
}

async function searchEvents(q: string, schoolId: string, limit: number): Promise<EventResult[]> {
  if (limit === 0) return []
  const rows = await prisma.event.findMany({
    where: {
      schoolId,
      status: { not: "cancelled" },
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { startsAt: "desc" },
    take: limit,
    select: { id: true, title: true, startsAt: true },
  })
  return rows.map((e) => ({ id: e.id, title: e.title, startsAt: e.startsAt, href: `/events/${e.id}` }))
}

async function searchBusinesses(q: string, schoolId: string, limit: number): Promise<BusinessResult[]> {
  if (limit === 0) return []
  const rows = await prisma.business.findMany({
    where: {
      schoolId,
      status: "approved",
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { tagline: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    },
    take: limit,
    select: { id: true, name: true, tagline: true, slug: true },
  })
  return rows.map((b) => ({ id: b.id, name: b.name, tagline: b.tagline, slug: b.slug, href: `/business/${b.slug}` }))
}

async function searchHashtags(q: string, limit: number): Promise<HashtagResult[]> {
  if (limit === 0) return []
  const tag = q.replace(/^#/, "")
  if (!tag) return []
  const rows = await prisma.hashtag.findMany({
    where: { tag: { contains: tag, mode: "insensitive" } },
    orderBy: { useCount: "desc" },
    take: limit,
    select: { tag: true, useCount: true },
  })
  return rows.map((h) => ({ tag: h.tag, useCount: h.useCount, href: `/feed?tag=${encodeURIComponent(h.tag)}` }))
}

/** Run the query across every scope the caller asked for (privacy + block aware). */
export async function searchAll(opts: {
  query: string
  viewerId: string
  schoolId?: string
  scope?: SearchScope
}): Promise<SearchResults> {
  const q = opts.query.trim()
  const scope: SearchScope = opts.scope ?? "all"
  if (q.length < 2) return empty(q, scope)

  const schoolId = opts.schoolId
  const blocked = await blockedIdsFor(opts.viewerId)

  const [people, posts, groups, events, businesses, hashtags] = await Promise.all([
    searchPeople(q, schoolId, opts.viewerId, limitFor(scope, "people")),
    schoolId ? searchPosts(q, schoolId, blocked, limitFor(scope, "posts")) : Promise.resolve([]),
    schoolId ? searchGroups(q, schoolId, limitFor(scope, "groups")) : Promise.resolve([]),
    schoolId ? searchEvents(q, schoolId, limitFor(scope, "events")) : Promise.resolve([]),
    schoolId ? searchBusinesses(q, schoolId, limitFor(scope, "businesses")) : Promise.resolve([]),
    searchHashtags(q, limitFor(scope, "hashtags")),
  ])

  return { query: q, scope, people, posts, groups, events, businesses, hashtags }
}

/** Total result count across all types (for the empty-state check). */
export function totalResults(r: SearchResults): number {
  return r.people.length + r.posts.length + r.groups.length + r.events.length + r.businesses.length + r.hashtags.length
}
