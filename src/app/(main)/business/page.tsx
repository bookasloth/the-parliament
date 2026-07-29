import Link from "next/link"
import { Building2, MapPin, Star, BadgePercent, Plus } from "lucide-react"
import { getDefaultSchoolId } from "@/lib/school"
import { optionalUser } from "@/modules/auth/session"
import { getCurrent } from "@/modules/membership/service"
import { listBusinesses } from "@/modules/business/service"

export const dynamic = "force-dynamic"

export default async function BusinessDirectoryPage() {
  const schoolId = await getDefaultSchoolId()
  const businesses = schoolId ? await listBusinesses(schoolId) : []

  const user = await optionalUser()
  const canList = user ? (await getCurrent(user.id)).benefits.businessListing : false

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Alumni Businesses</h1>
          <p className="text-sm text-gray-500">Businesses owned by JNV Nagpur alumni.</p>
        </div>
        {canList && (
          <Link href="/business/new" className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus className="h-4 w-4" /> List your business
          </Link>
        )}
      </div>

      {businesses.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500">
          No businesses listed yet.{canList ? " Be the first — list yours." : " Premium members can list a business."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((b) => (
            <Link key={b.id} href={`/business/${b.slug}`} className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-3">
                {b.logoUrl ? (
                  <img src={b.logoUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand"><Building2 className="h-6 w-6" /></div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-heading font-bold text-gray-900">{b.name}</p>
                  <p className="text-xs text-gray-500">{b.category.label}</p>
                </div>
              </div>
              {b.description && <p className="mt-3 line-clamp-2 text-sm text-gray-600">{b.description}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                {b.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{b.city}</span>}
                {b.ratingCount > 0 && <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500" />{Number(b.ratingAvg).toFixed(1)} ({b.ratingCount})</span>}
                {b.offersAlumniDiscount && <span className="flex items-center gap-1 text-green-600"><BadgePercent className="h-3.5 w-3.5" />Alumni discount</span>}
              </div>
              <p className="mt-3 text-xs text-gray-400">by {b.owner.displayName || b.owner.legalName}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
