"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/modules/auth/session"
import { addCommitteeMember, removeCommitteeMember } from "@/modules/committees/service"

export async function addCommitteeMemberAction(input: {
  committee: string
  email: string
  name?: string
  role?: string
}): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  try {
    await addCommitteeMember(input)
    revalidatePath("/admin/committees")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function removeCommitteeMemberAction(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  try {
    await removeCommitteeMember(id)
    revalidatePath("/admin/committees")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
