// Distinct-actor aggregation for coalesced notifications (audit N-1). Pure — no
// DB — so it unit-tests without pulling in the service's next/server imports.

/** Most-recent distinct actor ids kept on a coalesced row (newest first). */
export const ACTOR_IDS_CAP = 5

export interface ActorAggregate {
  actorCount: number
  actorIds: string[]
}

/**
 * Fold a new actor into a coalesced notification's aggregate. A genuinely new
 * actor bumps the count and is prepended (newest-first, capped); a repeat actor
 * or a missing actorId leaves the aggregate unchanged (so a user rapidly
 * re-reacting doesn't inflate "and N others"). Pure + order-stable.
 */
export function mergeActor(current: ActorAggregate, actorId: string | null | undefined, cap = ACTOR_IDS_CAP): ActorAggregate {
  if (!actorId || current.actorIds.includes(actorId)) return current
  return {
    actorCount: current.actorCount + 1,
    actorIds: [actorId, ...current.actorIds].slice(0, cap),
  }
}

/**
 * Human "and N others" suffix for a title when more than one distinct actor is
 * aggregated. Empty string for a single actor. The stored title already names the
 * latest actor + action ("Priya reacted to your post"), so the UI appends this.
 */
export function othersSuffix(actorCount: number): string {
  const others = actorCount - 1
  if (others <= 0) return ""
  return others === 1 ? "and 1 other" : `and ${others} others`
}
