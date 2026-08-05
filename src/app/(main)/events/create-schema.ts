import { z } from "zod"

/** Validation for member-created events. Kept out of the "use server" file so it
 *  can be exported (a non-async value) and unit-tested. */
export const createEventSchema = z.object({
  title: z.string().trim().min(2).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  mode: z.enum(["in-person", "virtual", "hybrid"]),
  venue: z.string().trim().max(240).optional(),
  eventUrl: z.string().trim().url().max(2000).optional().or(z.literal("")),
})

export type CreateEventInput = z.infer<typeof createEventSchema>
