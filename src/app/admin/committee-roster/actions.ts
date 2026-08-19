"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/modules/auth/session"
import { enforceAdminRateLimit } from "@/modules/admin/rate-limit"
import { isAllowedImage } from "@/lib/supabase-storage"
import {
  createRosterMember, updateRosterMember, deleteRosterMember, setRosterPublished,
  reorderRoster, setRosterPhoto, removeRosterPhoto,
} from "@/modules/committee/roster"
import type { RosterMemberDTO } from "@/modules/committee/roster"

type Result<T = unknown> = ({ ok: true } & T) | { error: string }

const MAX_BYTES = 5 * 1024 * 1024
const id = z.string().uuid()

function fail(e: unknown): { error: string } {
  if (e instanceof z.ZodError) return { error: e.issues[0]?.message ?? "Invalid input" }
  if (e instanceof Error) return { error: e.message }
  return { error: "Something went wrong" }
}
function revalidate() {
  revalidatePath("/committee"); revalidatePath("/about"); revalidatePath("/admin/committee-roster")
}
async function gate(bucket: string) {
  const admin = await requireAdmin()
  await enforceAdminRateLimit(admin.id, bucket, 120, 60)
  return admin
}

const memberSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  position: z.string().trim().min(1, "Position is required").max(80),
  groupType: z.enum(["executive", "advisory"]).optional(),
  profileLink: z.union([z.literal(""), z.string().trim().url("Profile link must be a valid URL")]).optional(),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).optional(),
  phone: z.string().trim().max(20).optional(),
})

export async function createRosterMemberAction(input: unknown): Promise<Result<{ member: RosterMemberDTO }>> {
  try {
    await gate("committee-roster")
    const member = await createRosterMember(memberSchema.parse(input))
    revalidate()
    return { ok: true, member }
  } catch (e) { return fail(e) }
}

export async function updateRosterMemberAction(memberId: string, input: unknown): Promise<Result<{ member: RosterMemberDTO }>> {
  try {
    await gate("committee-roster")
    const member = await updateRosterMember(id.parse(memberId), memberSchema.parse(input))
    revalidate()
    return { ok: true, member }
  } catch (e) { return fail(e) }
}

export async function deleteRosterMemberAction(memberId: string): Promise<Result> {
  try {
    await gate("committee-roster")
    await deleteRosterMember(id.parse(memberId))
    revalidate()
    return { ok: true }
  } catch (e) { return fail(e) }
}

export async function setRosterPublishedAction(memberId: string, isPublished: boolean): Promise<Result> {
  try {
    await gate("committee-roster")
    await setRosterPublished(id.parse(memberId), Boolean(isPublished))
    revalidate()
    return { ok: true }
  } catch (e) { return fail(e) }
}

export async function reorderRosterAction(ids: string[]): Promise<Result> {
  try {
    await gate("committee-reorder")
    await reorderRoster(z.array(id).min(1).parse(ids))
    revalidate()
    return { ok: true }
  } catch (e) { return fail(e) }
}

export async function uploadRosterPhotoAction(formData: FormData): Promise<Result<{ member: RosterMemberDTO }>> {
  try {
    await gate("committee-photo")
    const memberId = id.parse(String(formData.get("id") || ""))
    const file = formData.get("file")
    if (!(file instanceof File)) return { error: "No file provided" }
    if (!isAllowedImage(file.type)) return { error: "Unsupported image type (use JPEG, PNG, or WebP)" }
    if (file.size > MAX_BYTES) return { error: "Image exceeds the 5MB limit" }
    const bytes = new Uint8Array(await file.arrayBuffer())
    const member = await setRosterPhoto(memberId, bytes, file.type)
    revalidate()
    return { ok: true, member }
  } catch (e) { return fail(e) }
}

export async function removeRosterPhotoAction(memberId: string): Promise<Result> {
  try {
    await gate("committee-photo")
    await removeRosterPhoto(id.parse(memberId))
    revalidate()
    return { ok: true }
  } catch (e) { return fail(e) }
}
