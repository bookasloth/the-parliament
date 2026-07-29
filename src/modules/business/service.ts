import { prisma } from "@/lib/prisma"

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
  category: { select: { key: true, label: true } },
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
      bannerUrl: true, website: true, contactEmail: true, contactPhone: true, createdAt: true,
      owner: { select: { username: true, legalName: true, displayName: true } },
      reviews: {
        orderBy: { createdAt: "desc" }, take: 20,
        select: { id: true, rating: true, body: true, createdAt: true, reviewer: { select: { legalName: true, username: true } } },
      },
    },
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

export async function listBusinessCategories(schoolId: string) {
  return prisma.businessCategory.findMany({
    where: { OR: [{ schoolId }, { schoolId: null }], isActive: true },
    orderBy: { label: "asc" },
    select: { id: true, key: true, label: true },
  })
}
