import Link from "next/link"
import Image from "next/image"
import { Search as SearchIcon } from "lucide-react"
import { requireUser } from "@/modules/auth/session"
import { getDefaultSchoolId } from "@/lib/school"
import { searchAll, totalResults, isSearchScope, type SearchScope, type SearchResults } from "@/modules/search/service"
import { relativeTime } from "@/lib/relative-time"

export const dynamic = "force-dynamic"

const SCOPE_TABS: { key: SearchScope; label: string }[] = [
  { key: "all", label: "All" },
  { key: "people", label: "People" },
  { key: "posts", label: "Posts" },
  { key: "groups", label: "Groups" },
  { key: "events", label: "Events" },
  { key: "businesses", label: "Businesses" },
  { key: "hashtags", label: "Hashtags" },
]

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

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6">
      {/* Search box */}
      <form action="/search" method="get" className="mb-4">
        <input type="hidden" name="scope" value={scope} />
        <div className="relative max-w-2xl">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            name="q"
            defaultValue={q}
            autoFocus
            placeholder="Search people, posts, groups, events, businesses, #tags…"
            className="w-full rounded-[4px] border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
          />
        </div>
      </form>

      {/* Scope tabs */}
      <div className="mb-6 flex flex-wrap gap-1.5 border-b border-gray-200 pb-2">
        {SCOPE_TABS.map((t) => (
          <Link
            key={t.key}
            href={`/search?q=${encodeURIComponent(q)}&scope=${t.key}`}
            className={`rounded-[4px] px-3 py-1.5 text-sm font-medium transition-colors ${
              scope === t.key ? "bg-brand text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {q.length < 2 ? (
        <EmptyHint />
      ) : results && totalResults(results) === 0 ? (
        <NoResults query={q} />
      ) : results ? (
        <Results results={results} scope={scope} />
      ) : null}
    </div>
  )
}

function EmptyHint() {
  return (
    <p className="text-sm text-gray-500">Type at least 2 characters to search.</p>
  )
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
      <p className="text-sm text-gray-700">
        No results for <span className="font-semibold">“{query}”</span>.
      </p>
      <p className="mt-1 text-xs text-gray-500">Try a different spelling, a name, or a #hashtag.</p>
    </div>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">{children}</div>
    </section>
  )
}

function Results({ results, scope }: { results: SearchResults; scope: SearchScope }) {
  const show = (t: SearchScope) => scope === "all" || scope === t
  return (
    <div>
      {show("people") && (
        <Section title="People" count={results.people.length}>
          {results.people.map((p) => (
            <Link key={p.id} href={p.href} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
              <Image src={p.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}`} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" unoptimized />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                <p className="truncate text-xs text-gray-500">{p.headline ?? (p.username ? `@${p.username}` : "")}</p>
              </div>
            </Link>
          ))}
        </Section>
      )}

      {show("posts") && (
        <Section title="Posts" count={results.posts.length}>
          {results.posts.map((p) => (
            <Link key={p.id} href={p.href} className="block px-4 py-3 hover:bg-gray-50">
              <p className="line-clamp-2 text-sm text-gray-800">{p.snippet}</p>
              <p className="mt-1 text-xs text-gray-500">{p.authorName} · {relativeTime(p.createdAt)}</p>
            </Link>
          ))}
        </Section>
      )}

      {show("groups") && (
        <Section title="Groups" count={results.groups.length}>
          {results.groups.map((g) => (
            <Link key={g.id} href={g.href} className="block px-4 py-3 hover:bg-gray-50">
              <p className="text-sm font-medium text-gray-900">{g.name}</p>
              <p className="truncate text-xs text-gray-500">{g.memberCount} members{g.description ? ` · ${g.description}` : ""}</p>
            </Link>
          ))}
        </Section>
      )}

      {show("events") && (
        <Section title="Events" count={results.events.length}>
          {results.events.map((e) => (
            <Link key={e.id} href={e.href} className="block px-4 py-3 hover:bg-gray-50">
              <p className="text-sm font-medium text-gray-900">{e.title}</p>
              <p className="text-xs text-gray-500">{e.startsAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
            </Link>
          ))}
        </Section>
      )}

      {show("businesses") && (
        <Section title="Businesses" count={results.businesses.length}>
          {results.businesses.map((b) => (
            <Link key={b.id} href={b.href} className="block px-4 py-3 hover:bg-gray-50">
              <p className="text-sm font-medium text-gray-900">{b.name}</p>
              {b.tagline && <p className="truncate text-xs text-gray-500">{b.tagline}</p>}
            </Link>
          ))}
        </Section>
      )}

      {show("hashtags") && (
        <Section title="Hashtags" count={results.hashtags.length}>
          {results.hashtags.map((h) => (
            <Link key={h.tag} href={h.href} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <span className="text-sm font-medium text-brand">#{h.tag}</span>
              <span className="text-xs text-gray-500">{h.useCount} posts</span>
            </Link>
          ))}
        </Section>
      )}
    </div>
  )
}
