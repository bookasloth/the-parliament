import { z } from "zod"

// Plain module (no "use server") so unit tests can import the schema without
// pulling server-only deps (next-auth, prisma) transitively.
export const broadcastSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(2000).optional(),
  type: z.string().trim().min(1).max(40).default("announcement"),
})

export type BroadcastInput = z.input<typeof broadcastSchema>
