"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdmin } from "@/modules/auth/session"
import { resolveReport } from "@/modules/moderation/service"

const resolution = z.enum(["dismissed", "warned", "hidden", "removed"])

export async function resolveReportAction(
  reportId: string,
  res: "dismissed" | "warned" | "hidden" | "removed",
  notes?: string,
) {
  const admin = await requireAdmin()
  z.string().min(1).parse(reportId)
  await resolveReport({
    reportId,
    reviewerId: admin.id,
    resolution: resolution.parse(res),
    notes: notes?.trim() || undefined,
  })
  revalidatePath("/admin/moderation")
  return { ok: true }
}
