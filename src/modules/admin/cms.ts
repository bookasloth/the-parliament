import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { audit } from "@/lib/audit"

export class CmsNotFoundError extends Error {}

export const cmsSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/, "slug must be kebab-case")

export const savePageSchema = z.object({
  id: z.string().uuid().optional(), // omit = create
  slug: cmsSlugSchema,
  title: z.string().trim().min(1).max(200),
  body: z.string().max(100_000),
})
export type SavePageInput = z.infer<typeof savePageSchema>

export async function listPages() {
  return prisma.cmsPage.findMany({
    orderBy: { slug: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      _count: { select: { versions: true } },
    },
  })
}

export async function getPage(id: string) {
  const page = await prisma.cmsPage.findUnique({ where: { id } })
  if (!page) throw new CmsNotFoundError("Page not found")
  return page
}

/**
 * Create or update a page. On update, the PRIOR body is snapshotted into a
 * version first (so history + revert work). Editing keeps status unchanged;
 * publishing is a separate step.
 */
export async function savePage(
  actorId: string,
  input: SavePageInput,
  ip?: string,
): Promise<{ id: string }> {
  const data = savePageSchema.parse(input)

  if (!data.id) {
    // Uniqueness on slug guarded by the DB; surface a clean error.
    const clash = await prisma.cmsPage.findUnique({ where: { slug: data.slug }, select: { id: true } })
    if (clash) throw new Error("A page with that slug already exists")
    const page = await prisma.cmsPage.create({
      data: { slug: data.slug, title: data.title, body: data.body, updatedBy: actorId },
    })
    await audit({ actorId, action: "admin.cms.create", entityType: "cms_page", entityId: page.id, payload: { slug: data.slug }, ipInet: ip })
    return { id: page.id }
  }

  const existing = await prisma.cmsPage.findUnique({ where: { id: data.id } })
  if (!existing) throw new CmsNotFoundError("Page not found")

  await prisma.$transaction([
    prisma.cmsPageVersion.create({
      data: { pageId: existing.id, title: existing.title, body: existing.body, editedBy: actorId },
    }),
    prisma.cmsPage.update({
      where: { id: existing.id },
      data: { slug: data.slug, title: data.title, body: data.body, updatedBy: actorId },
    }),
  ])
  await audit({ actorId, action: "admin.cms.update", entityType: "cms_page", entityId: existing.id, payload: { slug: data.slug }, ipInet: ip })
  return { id: existing.id }
}

export async function publishPage(actorId: string, id: string, publish: boolean, ip?: string): Promise<{ ok: true }> {
  const page = await prisma.cmsPage.findUnique({ where: { id }, select: { id: true } })
  if (!page) throw new CmsNotFoundError("Page not found")
  await prisma.cmsPage.update({
    where: { id },
    data: { status: publish ? "published" : "draft", publishedAt: publish ? new Date() : null, updatedBy: actorId },
  })
  await audit({ actorId, action: publish ? "admin.cms.publish" : "admin.cms.unpublish", entityType: "cms_page", entityId: id, ipInet: ip })
  return { ok: true }
}

export async function listVersions(pageId: string) {
  return prisma.cmsPageVersion.findMany({
    where: { pageId },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, editedBy: true, createdAt: true },
  })
}

/** Restore a page to a prior version, snapshotting the current body first. */
export async function revertPage(actorId: string, pageId: string, versionId: bigint, ip?: string): Promise<{ ok: true }> {
  const [page, version] = await Promise.all([
    prisma.cmsPage.findUnique({ where: { id: pageId } }),
    prisma.cmsPageVersion.findUnique({ where: { id: versionId } }),
  ])
  if (!page) throw new CmsNotFoundError("Page not found")
  if (!version || version.pageId !== pageId) throw new CmsNotFoundError("Version not found")

  await prisma.$transaction([
    prisma.cmsPageVersion.create({
      data: { pageId: page.id, title: page.title, body: page.body, editedBy: actorId },
    }),
    prisma.cmsPage.update({
      where: { id: page.id },
      data: { title: version.title, body: version.body, updatedBy: actorId },
    }),
  ])
  await audit({ actorId, action: "admin.cms.revert", entityType: "cms_page", entityId: page.id, payload: { versionId: versionId.toString() }, ipInet: ip })
  return { ok: true }
}
