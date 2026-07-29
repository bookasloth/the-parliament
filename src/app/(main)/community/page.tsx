import Link from "next/link"
import { MapPin, BadgeCheck, GraduationCap } from "lucide-react"
import { getDefaultSchoolId } from "@/lib/school"
import { searchDirectory, getDirectoryFacets } from "@/modules/directory/service"
import { colorAvatar } from "@/lib/avatar"
import { CommunityFilters } from "./filters"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 24

const TIER_LABEL: Record<string, string> = {
  student: "Student", associate: "Associate", premium: "Premium",
  life: "Life", committee: "Committee", inactive: "Inactive",
}
const TIER_COLOR: Record<string, string> = {
  student: "text-green-600", associate: "text-amber-500", premium: "text-blue-700",
  life: "text-yellow-600", committee: "text-pink-500", inactive: "text-gray-400",
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const schoolId = (await getDefaultSchoolId()) ?? undefined
  const page = Math.max(1, parseInt(sp.page ?? "1") || 1)

  const [{ rows, total }, facets] = await Promise.all([
    searchDirectory(
      {
        schoolId,
        q: sp.q || undefined,
        batchId: sp.batch || undefined,
        houseId: sp.house || undefined,
        membershipStatus: sp.membership || undefined,
        city: sp.city || undefined,
        verifiedOnly: sp.verified === "1",
      },
      { page, pageSize: PAGE_SIZE },
    ),
    getDirectoryFacets(schoolId),
  ])

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const qs = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams()
    const merged = { ...sp, ...patch }
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v)
    const s = next.toString()
    return s ? `?${s}` : ""
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6">
      <div className="mb-5">
        <h1 className="font-heading text-2xl font-bold text-gray-900">Community</h1>
        <p className="text-sm text-gray-500">{total.toLocaleString()} alumni · search and filter the network.</p>
      </div>

      <CommunityFilters facets={facets} current={sp} />

      {rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          No alumni match these filters.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((r) => (
            <Link key={r.id} href={`/${r.username}`} className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-3">
                <img src={r.photoUrl || colorAvatar(r.id)} alt="" className="h-14 w-14 rounded-full object-cover" style={{ boxShadow: r.house ? `0 0 0 2px ${r.house.colorHex}` : undefined }} />
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate font-heading font-bold text-gray-900">
                    {r.displayName || r.legalName}
                    {r.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-brand" />}
                  </p>
                  <p className={`text-xs font-semibold ${TIER_COLOR[r.membershipStatus] ?? "text-gray-400"}`}>{TIER_LABEL[r.membershipStatus] ?? r.membershipStatus}</p>
                </div>
              </div>
              {r.headline && <p className="mt-3 line-clamp-2 text-sm text-gray-600">{r.headline}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                {r.batch && <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />{r.batch.label}</span>}
                {r.house && <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: r.house.colorHex }} />{r.house.name}</span>}
                {r.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{r.city}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm">
          {page > 1 && <Link href={qs({ page: String(page - 1) })} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 hover:bg-gray-50">← Prev</Link>}
          <span className="text-gray-500">Page {page} of {pages}</span>
          {page < pages && <Link href={qs({ page: String(page + 1) })} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 hover:bg-gray-50">Next →</Link>}
        </div>
      )}
    </div>
  )
}
