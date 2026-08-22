"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import {
  getBusinessBySlug, upsertReview, isValidRating, toggleBusinessFollow,
  createBusinessPost, deleteBusinessPost, replyToReview,
  updateBusiness, sanitizeFoundedYear, type UpdateBusinessInput,
} from "@/modules/business/service"
import { resolveBusinessImage } from "@/lib/r2"

/** key → keep(undefined) / clear(null) / public URL. */
async function resolveImageField(ownerId: string, value: string | null | undefined): Promise<string | null | undefined> {
  if (value === undefined) return undefined
  if (value === null) return null
  return resolveBusinessImage(ownerId, value)
}

const SOCIAL_KEYS = ["linkedin", "twitter", "instagram", "facebook", "youtube", "github"] as const

export async function updateBusinessAction(
  slug: string,
  input: Omit<UpdateBusinessInput, "foundedYear" | "socialLinks" | "logoUrl" | "bannerUrl"> & {
    foundedYear?: string | number | null
    socialLinks?: Record<string, string>
    // R2 keys (or null to clear, undefined to keep) — resolved to URLs server-side.
    logoKey?: string | null
    bannerKey?: string | null
  },
) {
  const owned = await requireOwnedBusiness(slug)
  if ("error" in owned) return { ok: false as const, error: owned.error }
  if (!input.name?.trim()) return { ok: false as const, error: "Business name is required." }
  if (!input.categoryId) return { ok: false as const, error: "Pick a category." }

  // Drop blank/unknown social platforms; validate the founded year.
  const socialLinks: Record<string, string> = {}
  for (const k of SOCIAL_KEYS) {
    const v = input.socialLinks?.[k]?.trim()
    if (v) socialLinks[k] = v
  }
  const foundedYear = sanitizeFoundedYear(input.foundedYear, new Date().getFullYear())

  let logoUrl: string | null | undefined
  let bannerUrl: string | null | undefined
  try {
    logoUrl = await resolveImageField(owned.business.ownerId, input.logoKey)
    bannerUrl = await resolveImageField(owned.business.ownerId, input.bannerKey)
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Image upload failed." }
  }

  const res = await updateBusiness(owned.business.id, { ...input, foundedYear, socialLinks, logoUrl, bannerUrl })
  revalidatePath(`/business/${res.slug}`)
  return { ok: true as const, slug: res.slug }
}

// Resolve an approved business the caller OWNS, or an error tuple. Shared by the
// owner-only actions below.
async function requireOwnedBusiness(slug: string) {
  const user = await requireUser()
  const business = await getBusinessBySlug(slug)
  if (!business || business.status !== "approved") return { error: "Business not found." as const }
  if (business.ownerId !== user.id) return { error: "Only the owner can do that." as const }
  return { business }
}

export async function createPostAction(slug: string, body: string, imageKey?: string | null) {
  const owned = await requireOwnedBusiness(slug)
  if ("error" in owned) return { ok: false as const, error: owned.error }
  if (!body.trim() && !imageKey) return { ok: false as const, error: "Post can't be empty." }
  let imageUrl: string | null = null
  if (imageKey) {
    try {
      imageUrl = await resolveBusinessImage(owned.business.ownerId, imageKey)
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Image upload failed." }
    }
  }
  await createBusinessPost(owned.business.id, body, imageUrl)
  revalidatePath(`/business/${slug}`)
  return { ok: true as const }
}

export async function deletePostAction(slug: string, postId: string) {
  const owned = await requireOwnedBusiness(slug)
  if ("error" in owned) return { ok: false as const, error: owned.error }
  await deleteBusinessPost(owned.business.id, postId)
  revalidatePath(`/business/${slug}`)
  return { ok: true as const }
}

export async function replyReviewAction(slug: string, reviewId: string, reply: string) {
  const owned = await requireOwnedBusiness(slug)
  if ("error" in owned) return { ok: false as const, error: owned.error }
  await replyToReview(owned.business.id, reviewId, reply)
  revalidatePath(`/business/${slug}`)
  return { ok: true as const }
}

export async function toggleFollowAction(slug: string) {
  const user = await requireUser()
  const business = await getBusinessBySlug(slug)
  if (!business || business.status !== "approved") {
    return { ok: false as const, error: "Business not found." }
  }
  const res = await toggleBusinessFollow(business.id, user.id)
  return { ok: true as const, ...res }
}

export async function submitReviewAction(input: { slug: string; rating: number; body?: string }) {
  const user = await requireUser()

  if (!isValidRating(input.rating)) {
    return { ok: false as const, error: "Pick a rating from 1 to 5 stars." }
  }

  const business = await getBusinessBySlug(input.slug)
  if (!business || business.status !== "approved") {
    return { ok: false as const, error: "Business not found." }
  }
  if (business.ownerId === user.id) {
    return { ok: false as const, error: "You can't review your own business." }
  }

  await upsertReview({
    businessId: business.id,
    reviewerId: user.id,
    rating: input.rating,
    body: input.body,
  })
  revalidatePath(`/business/${input.slug}`)
  return { ok: true as const }
}
