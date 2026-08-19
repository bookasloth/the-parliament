/**
 * Shared shape for a rendered committee member card. The live roster is
 * DB-backed (see @/modules/committee/roster) and mapped into this shape by the
 * /committee and /about pages; CommitteeTabs / MemberCard render it.
 */
export interface Member {
  name: string
  position: string
  email?: string
  phone?: string
  /** Headshot URL — falls back to an initial avatar when absent. */
  photo?: string
  /** Optional link on the member's name (profile, LinkedIn, etc.). */
  profileLink?: string
}
