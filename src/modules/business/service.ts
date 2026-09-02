import { prisma } from "@/lib/prisma"
import { sendNotification } from "@/modules/notifications/service"
import { EMPLOYEE_SIZES } from "./constants"

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 200) || "business"
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base
  for (let i = 2; i < 500; i++) {
    const exists = await prisma.business.findUnique({ where: { slug }, select: { id: true } })
    if (!exists) return slug
    slug = `${base}-${i}`
  }
  return `${base}-${Date.now().toString(36)}`
}

const listSelect = {
  id: true, slug: true, name: true, description: true, logoUrl: true, city: true,
  offersAlumniDiscount: true, ratingAvg: true, ratingCount: true, status: true,
  category: { select: { id: true, key: true, label: true } },
  owner: { select: { username: true, legalName: true, displayName: true } },
} as const

export async function listBusinesses(schoolId: string) {
  return prisma.business.findMany({
    where: { schoolId, status: "approved" },
    orderBy: { createdAt: "desc" },
    select: listSelect,
  })
}

export async function getBusinessBySlug(slug: string) {
  return prisma.business.findUnique({
    where: { slug },
    select: {
      ...listSelect,
      ownerId: true,
      bannerUrl: true, website: true, contactEmail: true, contactPhone: true, createdAt: true,
      tagline: true, industry: true, foundedYear: true, employeeSize: true,
      headquarters: true, socialLinks: true, followerCount: true,
      owner: {
        select: {
          id: true, username: true, legalName: true, displayName: true,
          profile: { select: { photoUrl: true } },
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" }, take: 20,
        select: {
          id: true, rating: true, body: true, createdAt: true, reviewerId: true,
          ownerReply: true, ownerReplyAt: true,
          reviewer: { select: { id: true, legalName: true, displayName: true, username: true, profile: { select: { photoUrl: true } } } },
        },
      },
      posts: {
        orderBy: { createdAt: "desc" }, take: 20,
        select: { id: true, body: true, imageUrl: true, createdAt: true },
      },
    },
  })
}

/** Create a page post. Ownership is enforced by the caller (server action). */
export async function createBusinessPost(businessId: string, body: string, imageUrl?: string | null) {
  const trimmed = body.trim()
  if (!trimmed && !imageUrl) throw new Error("Post can't be empty")
  return prisma.businessPost.create({
    data: { businessId, body: trimmed.slice(0, 3000), imageUrl: imageUrl || null },
    select: { id: true },
  })
}

/** Delete a page post, scoped to its business so a wrong id can't hit another page's post. */
export async function deleteBusinessPost(businessId: string, postId: string) {
  await prisma.businessPost.deleteMany({ where: { id: postId, businessId } })
}

/** Owner reply to a review (create/edit/clear). Scoped to the business. */
export async function replyToReview(businessId: string, reviewId: string, reply: string | null) {
  const body = reply?.trim() || null
  await prisma.businessReview.updateMany({
    where: { id: reviewId, businessId },
    data: { ownerReply: body, ownerReplyAt: body ? new Date() : null },
  })
}

/**
 * Merge a business's website + free-form socialLinks JSON into one clean map for
 * the SocialLinks widget: lowercased platform keys, empty/blank URLs dropped,
 * website folded in under the "website" key. Pure — unit-tested.
 */
export function normalizeSocialLinks(website: string | null | undefined, socialLinks: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (website && website.trim()) out.website = website.trim()
  if (socialLinks && typeof socialLinks === "object" && !Array.isArray(socialLinks)) {
    for (const [k, v] of Object.entries(socialLinks as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) out[k.toLowerCase()] = v.trim()
    }
  }
  return out
}

/** A review rating is an integer 1–5. Shared by the server action and upsertReview. */
export function isValidRating(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 5
}

/**
 * Create-or-update the viewer's review for a business, then recompute the
 * denormalized rating aggregate. One row per (business, reviewer) — enforced by
 * the unique index, so a repeat submit edits the existing review.
 */
export async function upsertReview(input: {
  businessId: string
  reviewerId: string
  rating: number
  body?: string | null
}) {
  const rating = input.rating
  if (!isValidRating(rating)) throw new Error("Rating must be an integer between 1 and 5")

  // Detect a genuinely new review (vs an edit) so the owner is notified once.
  const priorReview = await prisma.businessReview.findUnique({
    where: { businessId_reviewerId: { businessId: input.businessId, reviewerId: input.reviewerId } },
    select: { id: true },
  })

  await prisma.$transaction(async (tx) => {
    await tx.businessReview.upsert({
      where: { businessId_reviewerId: { businessId: input.businessId, reviewerId: input.reviewerId } },
      create: { businessId: input.businessId, reviewerId: input.reviewerId, rating, body: input.body?.trim() || null },
      update: { rating, body: input.body?.trim() || null },
    })
    const agg = await tx.businessReview.aggregate({
      where: { businessId: input.businessId },
      _avg: { rating: true },
      _count: true,
    })
    await tx.business.update({
      where: { id: input.businessId },
      data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count },
    })
  })

  // Notify the owner of a NEW review (audit P1-3 — reviews notified nobody).
  if (!priorReview) {
    const biz = await prisma.business.findUnique({
      where: { id: input.businessId },
      select: { ownerId: true, name: true, slug: true },
    })
    if (biz && biz.ownerId !== input.reviewerId) {
      const reviewer = await prisma.user.findUnique({
        where: { id: input.reviewerId },
        select: { displayName: true, legalName: true },
      })
      const fromName = reviewer?.displayName || reviewer?.legalName || "Someone"
      await sendNotification({
        userId: biz.ownerId,
        kind: "business_review",
        title: `${fromName} reviewed ${biz.name}`,
        body: `${rating}★`,
        entityType: "business",
        entityId: input.businessId,
        sendEmail: false,
      }).catch(() => {})
    }
  }
}

export { EMPLOYEE_SIZES }

/** Parse a founded year: a 4-digit year within 1800..current, else null. Pure. */
export function sanitizeFoundedYear(raw: unknown, currentYear: number): number | null {
  const n = typeof raw === "number" ? raw : parseInt(String(raw ?? "").trim(), 10)
  if (!Number.isInteger(n) || n < 1800 || n > currentYear) return null
  return n
}

export interface UpdateBusinessInput {
  name: string
  categoryId: string
  description?: string | null
  tagline?: string | null
  industry?: string | null
  foundedYear?: number | null
  employeeSize?: string | null
  headquarters?: string | null
  city?: string | null
  website?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  offersAlumniDiscount?: boolean
  socialLinks?: Record<string, string> | null
  // undefined = leave unchanged; null = clear; string = set (already a public URL).
  logoUrl?: string | null
  bannerUrl?: string | null
}

/** Patch an owned business. Ownership is enforced by the caller (server action). */
export async function updateBusiness(businessId: string, input: UpdateBusinessInput) {
  const clean = (s?: string | null) => (s && s.trim() ? s.trim() : null)
  return prisma.business.update({
    where: { id: businessId },
    data: {
      // Only touch images when the caller sent a value (undefined = keep).
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
      ...(input.bannerUrl !== undefined ? { bannerUrl: input.bannerUrl } : {}),
      name: input.name.trim(),
      categoryId: input.categoryId,
      description: clean(input.description),
      tagline: clean(input.tagline),
      industry: clean(input.industry),
      foundedYear: input.foundedYear ?? null,
      employeeSize: input.employeeSize && (EMPLOYEE_SIZES as readonly string[]).includes(input.employeeSize) ? input.employeeSize : null,
      headquarters: clean(input.headquarters),
      city: clean(input.city),
      website: clean(input.website),
      contactEmail: clean(input.contactEmail),
      contactPhone: clean(input.contactPhone),
      offersAlumniDiscount: input.offersAlumniDiscount ?? false,
      // Store the whole map each save (empty object clears prior socials).
      socialLinks: input.socialLinks ?? {},
    },
    select: { slug: true },
  })
}

export interface CreateBusinessInput {
  ownerId: string
  schoolId: string
  categoryId: string
  name: string
  description?: string | null
  website?: string | null
  city?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  offersAlumniDiscount?: boolean
}

export async function createBusiness(input: CreateBusinessInput) {
  const slug = await uniqueSlug(slugify(input.name))
  return prisma.business.create({
    data: {
      ownerId: input.ownerId,
      schoolId: input.schoolId,
      categoryId: input.categoryId,
      name: input.name,
      slug,
      description: input.description || null,
      website: input.website || null,
      city: input.city || null,
      contactEmail: input.contactEmail || null,
      contactPhone: input.contactPhone || null,
      offersAlumniDiscount: input.offersAlumniDiscount ?? false,
      status: "pending", // admin approves before it appears in the directory
    },
    select: { id: true, slug: true },
  })
}

/** Whether the viewer already follows a business (null viewer → false). */
export async function isFollowingBusiness(businessId: string, userId: string | null): Promise<boolean> {
  if (!userId) return false
  const row = await prisma.businessFollower.findUnique({
    where: { businessId_userId: { businessId, userId } },
    select: { id: true },
  })
  return row !== null
}

/**
 * Follow/unfollow a business and keep the denormalized followerCount in sync.
 * Idempotent: following twice stays followed, unfollowing when not followed is a
 * no-op. Returns the resulting state + count.
 */
export async function toggleBusinessFollow(businessId: string, userId: string): Promise<{ following: boolean; followerCount: number }> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.businessFollower.findUnique({
      where: { businessId_userId: { businessId, userId } },
      select: { id: true },
    })
    if (existing) {
      await tx.businessFollower.delete({ where: { id: existing.id } })
    } else {
      await tx.businessFollower.create({ data: { businessId, userId } })
    }
    // Recount from the source of truth so the denormalized column can't drift.
    const followerCount = await tx.businessFollower.count({ where: { businessId } })
    await tx.business.update({ where: { id: businessId }, data: { followerCount } })
    return { following: !existing, followerCount }
  })
}

/** Approved business slugs for the sitemap (public + crawlable). */
export async function listApprovedBusinessSlugs() {
  return prisma.business.findMany({
    where: { status: "approved" },
    orderBy: { createdAt: "desc" },
    select: { slug: true, createdAt: true },
  })
}

export async function listBusinessCategories(schoolId: string) {
  return prisma.businessCategory.findMany({
    where: { OR: [{ schoolId }, { schoolId: null }], isActive: true },
    orderBy: { label: "asc" },
    select: { id: true, key: true, label: true },
  })
}
