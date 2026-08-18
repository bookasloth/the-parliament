import { z } from "zod"

// Kept in a server-dep-free module so unit tests can import the schemas
// without loading "use server" deps (next-auth / prisma).
export const businessStatusSchema = z.enum(["approved", "rejected", "suspended", "pending"])
export const businessIdSchema = z.string().uuid()
