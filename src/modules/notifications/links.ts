import { prisma } from "@/lib/prisma"

export interface NotifCta {
  label: string
  href: string
  /** Filled (brand) vs outline button. */
  primary?: boolean
}

export interface NotifLinks {
  /** Where the whole notification row navigates. */
  href: string
  /** Small deep-link buttons rendered inside the row. */
  ctas: NotifCta[]
}

interface MinRow {
  type: string
  entityType: string | null
  entityId: string | null
}

/**
 * Deep-link + CTA buttons for a notification, given the id→handle lookups its
 * entity needs. Pure (no DB) so it unit-tests. `post`/`conversation` ids map
 * straight to routes; `user`/`event` need username/slug (resolved by the batch
 * loader below). Unknown/admin entities fall back to a safe hub — never a 404.
 */
export function buildNotifLinks(
  n: MinRow,
  usernameById: Map<string, string | null>,
): NotifLinks {
  const { entityType, entityId } = n
  if (entityId) {
    if (entityType === "post") {
      const href = `/feed/${entityId}`
      return { href, ctas: [{ label: "View post", href, primary: true }] }
    }
    if (entityType === "conversation") {
      const href = `/messages/${entityId}`
      return { href, ctas: [{ label: "Reply", href, primary: true }] }
    }
    if (entityType === "event") {
      // The /events/[slug] route resolves its param by event id (misnamed).
      const href = `/events/${entityId}`
      return { href, ctas: [{ label: "View event", href, primary: true }] }
    }
    if (entityType === "user") {
      const username = usernameById.get(entityId)
      if (username) {
        const href = `/${username}`
        return { href, ctas: [{ label: "View profile", href, primary: true }] }
      }
    }
    if (entityType === "committee_invite" || entityType === "alumni_verification") {
      return { href: "/membership", ctas: [{ label: "View", href: "/membership" }] }
    }
    if (entityType === "endorsement") {
      return { href: "/settings", ctas: [{ label: "View", href: "/settings" }] }
    }
  }
  return { href: "/notifications", ctas: [] }
}

/**
 * Resolve deep-links + CTAs for a batch of notifications — batches the one
 * lookup that needs it (user id → username) into a single query.
 */
export async function resolveNotifLinks(rows: MinRow[]): Promise<NotifLinks[]> {
  const userIds = new Set<string>()
  for (const r of rows) {
    if (r.entityId && r.entityType === "user") userIds.add(r.entityId)
  }

  const users = userIds.size
    ? await prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, username: true } })
    : []
  const usernameById = new Map(users.map((u) => [u.id, u.username]))
  return rows.map((r) => buildNotifLinks(r, usernameById))
}
