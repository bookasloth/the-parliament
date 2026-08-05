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
  // Ticket price in whole rupees; 0 / omitted = free. Capped at ₹1,00,000.
  priceRupees: z.number().int().min(0).max(100000).optional(),
})

/** Rupees → paise (integer). Guards NaN/negative to 0. */
export function rupeesToPaise(rupees?: number): number {
  if (!rupees || rupees < 0 || !Number.isFinite(rupees)) return 0
  return Math.round(rupees) * 100
}

export type CreateEventInput = z.infer<typeof createEventSchema>
