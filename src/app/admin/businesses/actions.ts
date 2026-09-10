"use server"

import { revalidatePath, updateTag } from "next/cache"
import { requireAdmin } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { featuredTermEnd } from "@/modules/business/featured"
import { businessStatusSchema, businessIdSchema, businessFeaturedSchema } from "./schema"

export async function setBusinessStatus(
  id: string,
  status: "approved" | "rejected" | "suspended" | "pending",
) {
  await requireAdmin()
  const parsedId = businessIdSchema.parse(id)
  const parsedStatus = businessStatusSchema.parse(status)
  await prisma.business.update({ where: { id: parsedId }, data: { status: parsedStatus } })
  revalidatePath("/admin/businesses")
  updateTag("businesses") // reflect approval/suspension in the public directory now
  return { ok: true }
}

/**
 * Turn a listing's paid Featured slot on/off. Turning it on stamps a 1-year term
 * (featuredUntil) so the promotion auto-expires; turning it off clears the term.
 * Busts the directory cache tag so the change shows immediately.
 */
export async function setBusinessFeatured(id: string, featured: boolean) {
  await requireAdmin()
  const parsedId = businessIdSchema.parse(id)
  const parsedFeatured = businessFeaturedSchema.parse(featured)
  await prisma.business.update({
    where: { id: parsedId },
    data: {
      featured: parsedFeatured,
      featuredUntil: parsedFeatured ? featuredTermEnd() : null,
    },
  })
  revalidatePath("/admin/businesses")
  updateTag("businesses")
  return { ok: true }
}
