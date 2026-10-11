import { z } from "zod"

/** Validation for a group help-request submission. Pure — safe to unit test. */
export const groupRequestSchema = z.object({
  groupId: z.string().uuid(),
  category: z.enum(["emergency", "travel", "access", "career", "mentor"]),
  body: z.string().trim().min(5, "Add a few words of detail").max(2000),
})

export type SubmitGroupRequestInput = z.infer<typeof groupRequestSchema>

/** Admin "Create Group" input. Only custom groups — batch/house/gender/blood groups are auto-assigned. */
export const createGroupSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(160),
  description: z.string().trim().max(2000).optional().transform((s) => s || null),
  // ponytail: no "secret" — the member UI only models public/private and would show secret as public.
  visibility: z.enum(["public", "private"]),
})

export type CreateGroupInput = z.input<typeof createGroupSchema>
