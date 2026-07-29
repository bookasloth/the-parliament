import Link from "next/link"
import { notFound } from "next/navigation"
import { Building2, MapPin, Star, BadgePercent, Globe, Mail, Phone } from "lucide-react"
import { getBusinessBySlug } from "@/modules/business/service"

export const dynamic = "force-dynamic"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const fmt = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`

export default async function BusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const b = await getBusinessBySlug(slug)
  if (!b || b.status !== "approved") notFound()

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
      <Link href="/business" className="text-sm text-brand hover:underline">← All businesses</Link>

      <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {b.bannerUrl && <img src={b.bannerUrl} alt="" className="h-40 w-full object-cover" />}
        <div className="p-6">
          <div className="flex items-start gap-4">
            {b.logoUrl ? (
              <img src={b.logoUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-brand-50 text-brand"><Building2 className="h-8 w-8" /></div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="font-heading text-2xl font-bold text-gray-900">{b.name}</h1>
              <p className="text-sm text-gray-500">{b.category.label}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                {b.city && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{b.city}</span>}
                {b.ratingCount > 0 && <span className="flex items-center gap-1"><Star className="h-4 w-4 text-amber-500" />{Number(b.ratingAvg).toFixed(1)} ({b.ratingCount} reviews)</span>}
                {b.offersAlumniDiscount && <span className="flex items-center gap-1 text-green-600"><BadgePercent className="h-4 w-4" />Alumni discount</span>}
              </div>
            </div>
          </div>

          {b.description && <p className="mt-5 whitespace-pre-line text-sm text-gray-700">{b.description}</p>}

          <div className="mt-5 flex flex-wrap gap-4 text-sm">
            {b.website && <a href={b.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-brand hover:underline"><Globe className="h-4 w-4" />Website</a>}
            {b.contactEmail && <a href={`mailto:${b.contactEmail}`} className="flex items-center gap-1.5 text-brand hover:underline"><Mail className="h-4 w-4" />{b.contactEmail}</a>}
            {b.contactPhone && <span className="flex items-center gap-1.5 text-gray-600"><Phone className="h-4 w-4" />{b.contactPhone}</span>}
          </div>

          <p className="mt-5 text-xs text-gray-400">
            Owned by{" "}
            <Link href={`/${b.owner.username}`} className="text-gray-600 hover:underline">{b.owner.displayName || b.owner.legalName}</Link>
            {" · listed "}{fmt(new Date(b.createdAt))}
          </p>
        </div>
      </div>

      {b.reviews.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 font-heading text-lg font-bold text-gray-900">Reviews</h2>
          <div className="space-y-4">
            {b.reviews.map((r) => (
              <div key={r.id} className="border-b border-gray-50 pb-4 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-800">{r.reviewer.legalName}</span>
                  <span className="flex items-center gap-0.5 text-xs text-amber-500">{"★".repeat(r.rating)}<span className="text-gray-300">{"★".repeat(5 - r.rating)}</span></span>
                </div>
                {r.body && <p className="mt-1 text-sm text-gray-600">{r.body}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
