// Prisma-free business constants — safe to import from client components.
// (service.ts pulls in the DB layer, so anything a "use client" file needs
// must live here instead.)

/** Company-size buckets for the edit form (LinkedIn-style). */
export const EMPLOYEE_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"] as const
