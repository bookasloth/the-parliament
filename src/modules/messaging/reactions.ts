// Pure reaction helpers — no DB, no React — so both the server service and the
// client view share one implementation and it stays unit-testable.
import type { MessageView, MessageReactionView } from "./types"

/**
 * Decide the next reaction state when a user taps `tapped` on a message they
 * currently react to with `current` (null = none). Tapping the same emoji clears
 * it (toggle); a different emoji replaces it (Instagram behaviour).
 */
export function nextReaction(
  current: string | null,
  tapped: string,
): { removed: boolean; emoji: string | null } {
  if (current === tapped) return { removed: true, emoji: null }
  return { removed: false, emoji: tapped }
}

/** Apply a reaction change to a message list (one reaction per user per message). */
export function applyReaction(
  msgs: MessageView[],
  messageId: string,
  userId: string,
  emoji: string,
  removed: boolean,
): MessageView[] {
  return msgs.map((m) => {
    if (m.id !== messageId) return m
    const others = m.reactions.filter((r) => r.userId !== userId)
    return { ...m, reactions: removed ? others : [...others, { emoji, userId }] }
  })
}

/** Group reactions into [emoji, count] pairs, preserving first-seen order. */
export function groupReactions(reactions: MessageReactionView[]): [string, number][] {
  const map = new Map<string, number>()
  for (const r of reactions) map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1)
  return [...map.entries()]
}
