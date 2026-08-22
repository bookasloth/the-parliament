import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { getDefaultSchoolId } from "@/lib/school"
import { getBusinessBySlug, listBusinessCategories } from "@/modules/business/service"
import { EditBusinessForm } from "./edit-form"

export const dynamic = "force-dynamic"

export default async function EditBusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const user = await requireUser()
  const b = await getBusinessBySlug(slug)
  if (!b) notFound()
  if (b.ownerId !== user.id) redirect(`/business/${slug}`)

  const schoolId = await getDefaultSchoolId()
  const categories = schoolId ? await listBusinessCategories(schoolId) : []
  const socials = (b.socialLinks && typeof b.socialLinks === "object" && !Array.isArray(b.socialLinks)
    ? b.socialLinks
    : {}) as Record<string, string>

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6">
      <Link href={`/business/${slug}`} className="text-sm text-brand hover:underline">← Back to page</Link>
      <h1 className="mt-3 font-heading text-2xl font-bold text-gray-900">Edit business</h1>
      <p className="mb-6 text-sm text-gray-500">Update your company details, contact info, and links.</p>
      <EditBusinessForm
        slug={slug}
        categories={categories}
        initial={{
          name: b.name,
          categoryId: b.category.id,
          description: b.description ?? "",
          tagline: b.tagline ?? "",
          industry: b.industry ?? "",
          foundedYear: b.foundedYear ? String(b.foundedYear) : "",
          employeeSize: b.employeeSize ?? "",
          headquarters: b.headquarters ?? "",
          city: b.city ?? "",
          website: b.website ?? "",
          contactEmail: b.contactEmail ?? "",
          contactPhone: b.contactPhone ?? "",
          offersAlumniDiscount: b.offersAlumniDiscount,
          socials,
          logoUrl: b.logoUrl,
          bannerUrl: b.bannerUrl,
        }}
      />
    </div>
  )
}
