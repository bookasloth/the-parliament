"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/modules/auth/session"
import { enforceAdminRateLimit } from "@/modules/admin/rate-limit"
import { isAllowedImage, uploadCommitteePhoto } from "@/lib/supabase-storage"
import { setCommitteePhoto, removeCommitteePhoto } from "@/modules/committee/photos"

type Result<T = unknown> = ({ ok: true } & T) | { error: string }

const MAX_BYTES = 5 * 1024 * 1024
const keySchema = z.string().min(1).max(40).regex(/^[a-z0-9-]+$/i, "invalid member key")

function fail(e: unknown): { error: string } {
  if (e instanceof z.ZodError) return { error: e.issues[0]?.message ?? "Invalid input" }
  if (e instanceof Error) return { error: e.message }
  return { error: "Something went wrong" }
}

function revalidate() {
  revalidatePath("/committee")
  revalidatePath("/about")
  revalidatePath("/admin/committee-photos")
}

export async function uploadCommitteePhotoAction(formData: FormData): Promise<Result<{ url: string; key: string }>> {
  try {
    const admin = await requireAdmin()
    await enforceAdminRateLimit(admin.id, "committee-photo", 60, 60)
    const key = keySchema.parse(String(formData.get("key") || ""))
    const file = formData.get("file")
    if (!(file instanceof File)) return { error: "No file provided" }
    if (!isAllowedImage(file.type)) return { error: "Unsupported image type (use JPEG, PNG, or WebP)" }
    if (file.size > MAX_BYTES) return { error: "Image exceeds the 5MB limit" }
    const bytes = new Uint8Array(await file.arrayBuffer())
    const url = await uploadCommitteePhoto(key, bytes, file.type)
    await setCommitteePhoto(admin.id, key, url)
    revalidate()
    return { ok: true, url, key }
  } catch (e) {
    return fail(e)
  }
}

export async function removeCommitteePhotoAction(key: string): Promise<Result> {
  try {
    const admin = await requireAdmin()
    await removeCommitteePhoto(admin.id, keySchema.parse(key))
    revalidate()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
