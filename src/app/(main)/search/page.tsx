import Link from "next/link"
import Image from "next/image"
import { Sparkles } from "lucide-react"
import { requireUser } from "@/modules/auth/session"
import { getDefaultSchoolId } from "@/lib/school"
import { getFollowingIds } from "@/modules/connections/service"
import { searchAll, totalResults, isSearchScope, type SearchScope, type SearchResults, type PersonResult } from "@/modules/search/service"
import { relativeTime } from "@/lib/relative-time"
import { colorAvatar } from "@/lib/avatar"
import { AlumniProfileCard } from "@/components/shared/AlumniProfileCard"
import { FollowButton } from "@/components/shared/FollowButton"
import { LogoMark } from "@/components/shared/Logo"
import type { AlumniCard, Membership } from "@/lib/homepage-data"
import { SearchBar, ScopePills } from "./search-client"

export const dynamic = "force-dynamic"

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string }>
}) {
  const viewer = await requireUser()
  const sp = await searchParams
  const q = (sp.q ?? "").trim()
  const scope: SearchScope = isSearchScope(sp.scope) ? sp.scope : "all"
  const schoolId = (await getDefaultSchoolId()) ?? undefined

  const results = q.length >= 2 ? await searchAll({ query: q, viewerId: viewer.id, schoolId, scope }) : null
  const followingIds = results && (scope === "all" || scope === "people") && results.people.length
    ? await getFollowingIds(viewer.id)
    : new Set<string>()

  const topBar = (
    <header className="flex items-center justify-between px-4 py-4 sm:px-8">
      <Link href="/feed" className="flex items-center gap-2" aria-label="NNAWCA home">
        <LogoMark className="h-8 w-8" />
        <span className="font-heading text-lg font-bold text-gray-900">NNAWCA</span>
      </Link>
      <Link href={viewer.username ? `/${viewer.username}` : "/profile/edit"} className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-semibold text-gray-700 hover:border-brand hover:text-brand">
        My profile
      </Link>
    </header>
  )

  // ── Landing (no query): centered hero ──────────────────────────────────────
  if (!results) {
    return (
      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-white">
        {topBar}
        <main className="flex flex-1 flex-col items-center justify-center px-4 pb-24">
          <h1 className="mb-8 text-center font-heading text-3xl font-bold text-gray-600 sm:text-4xl">
            Search. Discover. Connect.
          </h1>
          <SearchBar scope={scope} variant="hero" />
          <div className="mt-6"><ScopePills query="" scope={scope} /></div>
          <p className="mt-8 flex items-center gap-1.5 text-sm text-gray-500">
            <Sparkles className="h-4 w-4 text-brand" /> <span className="font-bold text-gray-700">AI Mode:</span> Get instant answers with AI →
          </p>
        </main>
        <SearchFooter />
      </div>
    )
  }

  // ── Results ────────────────────────────────────────────────────────────────
  const nothing = totalResults(results) === 0
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-white">
      {topBar}
      <div className="flex flex-col items-center gap-4 border-b border-gray-100 px-4 pb-5 pt-2">
        <SearchBar initialQuery={q} scope={scope} variant="bar" />
        <ScopePills query={q} scope={scope} variant="bar" />
      </div>
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 py-6 sm:px-6">
        {nothing ? (
          <NoResults query={q} />
        ) : (
          <Results results={results} scope={scope} meId={viewer.id} followingIds={followingIds} />
        )}
      </main>
    </div>
  )
}

function SearchFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-5 text-sm text-gray-500 sm:px-8">
      <div className="flex gap-5">
        <Link href="/feed" className="hover:text-brand">Feed</Link>
        <Link href="/community" className="hover:text-brand">Community</Link>
        <Link href="/events" className="hover:text-brand">Events</Link>
      </div>
      <div className="flex items-center gap-5">
        <Link href="/membership" className="hover:text-brand">Membership</Link>
        <span>
          Made by{" "}
          <a href="https://shubhamdatarkar.com/projects/nnawca" target="_blank" rel="noopener noreferrer" className="font-medium text-gray-600 hover:text-brand">Durga</a>
          {" "}&amp;{" "}
          <a href="https://shubhamdatarkar.com/projects/nnawca" target="_blank" rel="noopener noreferrer" className="font-medium text-gray-600 hover:text-brand">Shubham</a>
        </span>
      </div>
    </footer>
  )
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
      <p className="text-sm text-gray-700">No results for <span className="font-semibold">&ldquo;{query}&rdquo;</span>.</p>
      <p className="mt-1 text-xs text-gray-500">Try a different spelling, a name, or a #hashtag.</p>
    </div>
  )
}

function personToCard(p: PersonResult): AlumniCard {
  return {
    id: p.id,
    name: p.name,
    batch: p.batch,
    batchLabel: p.batch ? `${p.batch} Batch` : "",
    batchAlt: p.batch,
    house: p.house,
    company: p.company ?? "",
    achievement: "",
    image: p.photoUrl || colorAvatar(p.id),
    location: p.city ?? undefined,
    membership: (p.membership as Membership) ?? "student",
    bio: p.headline ?? undefined,
  }
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">{children}</h2>
}

function PeopleGrid({ people, meId, followingIds }: { people: PersonResult[]; meId: string; followingIds: Set<string> }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {people.map((p) => (
        <AlumniProfileCard
          key={p.id}
          alumni={personToCard(p)}
          profileHref={p.href}
          verified={p.verified}
          tierColoredVerified
          hideMembership
          actions={
            <div className="flex w-full items-stretch gap-2">
              {meId !== p.id && (
                <div className="flex-1 [&>button]:flex [&>button]:w-full [&>button]:justify-center [&>button]:py-2">
                  <FollowButton userId={p.id} initialFollowing={followingIds.has(p.id)} />
                </div>
              )}
              <Link href={p.href} className="w-[88px] flex-shrink-0 rounded-[3px] border border-gray-200 px-4 py-2 text-center text-[13px] font-semibold text-gray-700 transition-colors hover:bg-gray-50">Profile</Link>
            </div>
          }
        />
      ))}
    </div>
  )
}

function PostsList({ posts }: { posts: SearchResults["posts"] }) {
  return (
    <div className="mx-auto max-w-[600px] space-y-3">
      {posts.map((p) => (
        <Link key={p.id} href={p.href} className="block rounded-[5px] border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm">
          <div className="flex items-center gap-2.5">
            <Image src={p.authorAvatar || colorAvatar(p.id)} alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover" unoptimized />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{p.authorName}</p>
              <p className="text-xs text-gray-400">{relativeTime(p.createdAt)}</p>
            </div>
          </div>
          <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-800 line-clamp-4">{p.snippet}</p>
        </Link>
      ))}
    </div>
  )
}

function Results({ results, scope, meId, followingIds }: { results: SearchResults; scope: SearchScope; meId: string; followingIds: Set<string> }) {
  const show = (t: SearchScope) => scope === "all" || scope === t
  return (
    <div className="space-y-10">
      {show("people") && results.people.length > 0 && (
        <section>{scope === "all" && <SectionHeading>People</SectionHeading>}<PeopleGrid people={results.people} meId={meId} followingIds={followingIds} /></section>
      )}
      {show("posts") && results.posts.length > 0 && (
        <section>{scope === "all" && <SectionHeading>Posts</SectionHeading>}<PostsList posts={results.posts} /></section>
      )}
      {show("events") && results.events.length > 0 && (
        <section>
          {scope === "all" && <SectionHeading>Events</SectionHeading>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {results.events.map((e) => (
              <Link key={e.id} href={e.href} className="rounded-[5px] border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm">
                <p className="text-sm font-semibold text-gray-900">{e.title}</p>
                <p className="mt-1 text-xs text-gray-500">{e.startsAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
      {show("businesses") && results.businesses.length > 0 && (
        <section>
          {scope === "all" && <SectionHeading>Businesses</SectionHeading>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.businesses.map((b) => (
              <Link key={b.id} href={b.href} className="rounded-[5px] border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm">
                <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                {b.tagline && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{b.tagline}</p>}
              </Link>
            ))}
          </div>
        </section>
      )}
      {show("hashtags") && results.hashtags.length > 0 && (
        <section>
          {scope === "all" && <SectionHeading>Hashtags</SectionHeading>}
          <div className="flex flex-wrap gap-2">
            {results.hashtags.map((h) => (
              <Link key={h.tag} href={h.href} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:border-brand">
                <span className="font-semibold text-brand">#{h.tag}</span>
                <span className="text-xs text-gray-400">{h.useCount} posts</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
