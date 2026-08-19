import { slugify } from "@/lib/slug"

/**
 * Pick a URL-safe album slug that doesn't collide with `taken`. Reuses the
 * app's shared `slugify` (don't duplicate the transform); adds -2..-99 then a
 * timestamp suffix on collision — same escalation as username generation. Pure
 * (save the timestamp fallback) so the collision logic is unit-testable: the
 * caller supplies the set of already-used slugs.
 */
export function uniqueSlug(title: string, taken: Iterable<string>): string {
  const base = slugify(title)
  const set = taken instanceof Set ? taken : new Set(taken)
  if (!set.has(base)) return base
  for (let i = 2; i < 100; i++) {
    const cand = `${base}-${i}`
    if (!set.has(cand)) return cand
  }
  return `${base}-${Date.now().toString(36)}`
}
