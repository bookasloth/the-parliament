/** Badge key (snake_case) ↔ URL slug (kebab-case). Keys never contain hyphens,
 *  so the round-trip is lossless. */
export const keyToSlug = (key: string) => key.replaceAll("_", "-");
export const slugToKey = (slug: string) => slug.replaceAll("-", "_");
