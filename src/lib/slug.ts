/**
 * URL-safe slug from arbitrary text. Prisma-free so it can be imported by
 * unit-tested pure logic (username generation, album slugs). Lowercase, strip
 * non-[a-z0-9], spaces→"-", collapse/trim dashes, cap at 40 chars; falls back
 * to a timestamp token when the input has no usable characters.
 */
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
  return base || `user-${Date.now().toString(36)}`
}
