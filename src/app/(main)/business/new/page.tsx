import { redirect } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { getDefaultSchoolId } from "@/lib/school"
import { getCurrent } from "@/modules/membership/service"
import { listBusinessCategories } from "@/modules/business/service"
import { UpgradePrompt } from "@/components/shared/UpgradePrompt"
import type { PlanCode } from "@/config/membership"
import { NewBusinessForm } from "./form"

export const dynamic = "force-dynamic"

export default async function NewBusinessPage() {
  const user = await requireUser()
  const current = await getCurrent(user.id)
  const schoolId = await getDefaultSchoolId()
  if (!schoolId) redirect("/business")

  if (!current.benefits.businessListing) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <h1 className="font-heading text-xl font-bold text-gray-900">List your business</h1>
        <p className="mt-2 text-sm text-gray-500">Listing a business in the alumni directory is a Premium benefit.</p>
        <div className="mt-5 flex justify-center">
          <UpgradePrompt currentPlan={current.planCode as PlanCode} feature="Listing your business" />
        </div>
      </div>
    )
  }

  const categories = await listBusinessCategories(schoolId)
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6">
      <h1 className="font-heading text-2xl font-bold text-gray-900">List your business</h1>
      <p className="mb-6 text-sm text-gray-500">Submitted listings are reviewed before they appear in the directory.</p>
      <NewBusinessForm categories={categories} />
    </div>
  )
}
