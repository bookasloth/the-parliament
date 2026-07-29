"use server"

import { redirect } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { getDefaultSchoolId } from "@/lib/school"
import { getCurrent } from "@/modules/membership/service"
import { createBusiness } from "@/modules/business/service"

export async function createBusinessAction(input: {
  name: string
  categoryId: string
  description?: string
  website?: string
  city?: string
  contactEmail?: string
  contactPhone?: string
  offersAlumniDiscount?: boolean
}) {
  const user = await requireUser()

  // Listing a business is a Premium benefit — enforce server-side.
  const current = await getCurrent(user.id)
  if (!current.benefits.businessListing) {
    throw new Error("Listing a business requires a Premium membership")
  }

  const schoolId = await getDefaultSchoolId()
  if (!schoolId) throw new Error("No school configured")
  if (!input.name?.trim()) throw new Error("Business name is required")
  if (!input.categoryId) throw new Error("Please pick a category")

  await createBusiness({
    ownerId: user.id,
    schoolId,
    categoryId: input.categoryId,
    name: input.name.trim(),
    description: input.description,
    website: input.website,
    city: input.city,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    offersAlumniDiscount: input.offersAlumniDiscount,
  })

  // New listings are pending admin approval before they appear in the directory.
  redirect("/business?submitted=1")
}
