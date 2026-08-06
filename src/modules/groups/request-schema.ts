import { z } from "zod"

/** Validation for a group help-request submission. Pure — safe to unit test. */
export const groupRequestSchema = z.object({
  groupId: z.string().uuid(),
  category: z.enum(["emergency", "travel", "access", "career", "mentor"]),
  body: z.string().trim().min(5, "Add a few words of detail").max(2000),
})

export type SubmitGroupRequestInput = z.infer<typeof groupRequestSchema>
