"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/gate"
import { enforceAdminRateLimit } from "@/modules/admin/rate-limit"
import {
  savePageSchema,
  savePage,
  getPage,
  publishPage,
  listVersions,
  revertPage,
  CmsNotFoundError,
} from "@/modules/admin/cms"

type Result = { ok: true } | { ok: false; error: string }

export async function savePageAction(input: {
  id?: string
  slug: string
  title: string
  body: string
}): Promise<Result> {
  const admin = await requirePermission("cms:manage")
  await enforceAdminRateLimit(admin.id, "cms-save", 30, 60)
  const parsed = savePageSchema.parse(input)
  try {
    await savePage(admin.id, parsed)
  } catch (e) {
    if (e instanceof CmsNotFoundError) return { ok: false, error: e.message }
    // savePage throws a plain Error on slug clash.
    if (e instanceof Error) return { ok: false, error: e.message }
    return { ok: false, error: "Failed to save page." }
  }
  revalidatePath("/admin/pages")
  return { ok: true }
}

/** Fetch a single page's body for the editor (listPages omits body). */
export async function getPageAction(id: string) {
  await requirePermission("cms:manage")
  const pageId = z.string().uuid().parse(id)
  const page = await getPage(pageId)
  return { id: page.id, slug: page.slug, title: page.title, body: page.body }
}

export async function publishPageAction(id: string, publish: boolean): Promise<Result> {
  const admin = await requirePermission("cms:manage")
  const pageId = z.string().uuid().parse(id)
  const flag = z.boolean().parse(publish)
  try {
    await publishPage(admin.id, pageId, flag)
  } catch (e) {
    if (e instanceof CmsNotFoundError) return { ok: false, error: e.message }
    return { ok: false, error: "Failed to update publish state." }
  }
  revalidatePath("/admin/pages")
  return { ok: true }
}

export async function listVersionsAction(pageId: string) {
  await requirePermission("cms:manage")
  const id = z.string().uuid().parse(pageId)
  const versions = await listVersions(id)
  return versions.map((v) => ({
    id: v.id.toString(),
    title: v.title,
    editedBy: v.editedBy,
    createdAt: v.createdAt.toISOString(),
  }))
}

export async function revertPageAction(pageId: string, versionId: string): Promise<Result> {
  const admin = await requirePermission("cms:manage")
  const id = z.string().uuid().parse(pageId)
  try {
    await revertPage(admin.id, id, BigInt(versionId))
  } catch (e) {
    if (e instanceof CmsNotFoundError) return { ok: false, error: e.message }
    return { ok: false, error: "Failed to revert page." }
  }
  revalidatePath("/admin/pages")
  return { ok: true }
}
