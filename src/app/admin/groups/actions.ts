"use server"

import { revalidatePath, updateTag } from "next/cache"
import { requirePermission } from "@/lib/gate"
import { prisma } from "@/lib/prisma"
import { getDefaultSchoolId } from "@/lib/school"
import { createGroupSchema, type CreateGroupInput } from "@/modules/groups/request-schema"

/** Create a custom group for the default school. */
export async function createGroupAction(
  input: CreateGroupInput,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const admin = await requirePermission("groups:manage")
  const parsed = createGroupSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid group" }
  const schoolId = await getDefaultSchoolId()
  if (!schoolId) return { ok: false, error: "No default school configured" }

  const group = await prisma.group.create({
    data: { schoolId, type: "custom", createdBy: admin.id, ...parsed.data },
    select: { id: true },
  })
  // /groups list is unstable_cache'd under tag "groups".
  updateTag("groups")
  revalidatePath("/admin/groups")
  revalidatePath("/groups")
  return { ok: true, id: group.id }
}

/** Delete a group. Members/posts cascade per schema FK rules. */
export async function deleteGroupAction(
  groupId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requirePermission("groups:manage")
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { isPermanent: true } })
  if (!group) return { ok: false, error: "Group not found" }
  if (group.isPermanent) return { ok: false, error: "Permanent groups can't be deleted" }
  await prisma.group.delete({ where: { id: groupId } })
  revalidatePath("/admin/groups")
  revalidatePath("/groups")
  return { ok: true }
}
