import { z } from "zod"

// Pure schemas kept out of the "use server" module so tests can import them
// without pulling the next-auth/prisma side-effect chain.
export const idSchema = z.string().uuid()
export const redemptionStatusSchema = z.enum(["fulfilled", "pending", "refunded", "cancelled"])
