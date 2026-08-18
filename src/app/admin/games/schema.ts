import { z } from "zod"

// ponytail: schemas live outside actions.ts so tests can import them DB-free
// (a "use server" module may only export async functions, and importing it
// would pull in top-level prisma).
export const gameIdSchema = z.string().uuid()
export const isActiveSchema = z.boolean()
