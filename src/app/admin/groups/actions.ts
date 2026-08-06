"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"

/** Delete a group. Members/posts cascade per schema FK rules. */
export async function deleteGroupAction(
  groupId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin()
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { isPermanent: true } })
  if (!group) return { ok: false, error: "Group not found" }
  if (group.isPermanent) return { ok: false, error: "Permanent groups can't be deleted" }
  await prisma.group.delete({ where: { id: groupId } })
  revalidatePath("/admin/groups")
  revalidatePath("/groups")
  return { ok: true }
}
