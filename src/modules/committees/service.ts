import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { COMMITTEE_LABELS, isCommitteeKey, type CommitteeKey } from "@/config/committees"

export interface CommitteeAlert {
  title: string
  detail: string
  actionUrl: string
  actionLabel: string
}

/**
 * Fan a committee alert out to every member's personal email. Best-effort and
 * sequential; never throws into the triggering action (caller should still
 * .catch defensively). Category "admin" → always-on + operational sender, so it
 * bypasses engagement opt-outs and the daily cap. No-op if the committee has no
 * members yet.
 */
export async function notifyCommittee(committee: CommitteeKey, alert: CommitteeAlert): Promise<number> {
  const members = await prisma.committeeMember.findMany({
    where: { committee },
    select: { email: true },
  })
  if (members.length === 0) return 0
  const committeeLabel = COMMITTEE_LABELS[committee]
  let sent = 0
  for (const m of members) {
    await sendEmail("committee_alert", m.email, { committeeLabel, ...alert }).catch((e) =>
      console.error(`committee_alert to ${committee} failed`, e),
    )
    sent++
  }
  return sent
}

// ── Admin management (email-based; members rotate) ──

export async function listCommitteeMembers() {
  return prisma.committeeMember.findMany({ orderBy: [{ committee: "asc" }, { createdAt: "asc" }] })
}

export interface AddMemberInput {
  committee: string
  email: string
  name?: string | null
  role?: string
}

/** Add (or update role/name of) a committee member by email. Idempotent per (committee, email). */
export async function addCommitteeMember(input: AddMemberInput) {
  const committee = input.committee.trim()
  const email = input.email.trim().toLowerCase()
  if (!isCommitteeKey(committee)) throw new Error("Unknown committee")
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email")
  const role = input.role === "chair" ? "chair" : "member"
  const name = input.name?.trim() || null
  return prisma.committeeMember.upsert({
    where: { committee_email: { committee, email } },
    create: { committee, email, name, role },
    update: { name, role },
  })
}

export async function removeCommitteeMember(id: string) {
  return prisma.committeeMember.delete({ where: { id } })
}
