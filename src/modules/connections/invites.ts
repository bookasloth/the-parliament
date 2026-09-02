import { prisma } from "@/lib/prisma"
import { deliver } from "@/modules/email/service"
import { emailShell, p, button } from "@/lib/email-layout"

// Member-initiated invites (audit P1-19): before this, only admins could invite —
// the largest untapped growth loop. A member sends an invite email carrying a
// referral link; the invitee signs up normally and is attributed via
// User.invitedById (captured in the signup route).

const APP = process.env.AUTH_URL || "https://nnawca.org"

export function inviteSignupUrl(inviterId: string): string {
  return `${APP}/auth/signup?ref=${encodeURIComponent(inviterId)}`
}

export interface InviteResult {
  ok: boolean
  reason?: "already_member" | "self" | "invalid_email"
}

/** Send one referral invite. No-op (already_member) if the email is a live user. */
export async function inviteByEmail(inviter: { id: string; name: string }, rawEmail: string): Promise<InviteResult> {
  const email = rawEmail.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, reason: "invalid_email" }

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, deletedAt: true } })
  if (existing && !existing.deletedAt) return { ok: false, reason: "already_member" }

  const url = inviteSignupUrl(inviter.id)
  const subject = `${inviter.name} invited you to join NNAWCA`
  const text = `${inviter.name} thinks you'd want to be on NNAWCA — the JNV Nagpur alumni network.\n\nJoin here: ${url}\n\nReconnect with your batchmates, find alumni by city and profession, and stay in the loop on reunions and events.`
  const html = emailShell({
    accent: "blue",
    pill: "Invitation",
    eyebrow: "NNAWCA · Alumni network",
    heading: `${inviter.name} invited you to <em>NNAWCA</em>`,
    body:
      p(`${inviter.name} thinks you'd want to be on NNAWCA — the JNV Nagpur alumni network.`) +
      p(`Reconnect with your batchmates, find alumni by city and profession, and stay in the loop on reunions and events.`) +
      button("Join NNAWCA", url, "blue"),
  })

  // Ad-hoc send through the guarded pipeline (suppression + logging). No opt-out
  // token: the recipient isn't a member with preferences yet.
  const res = await deliver({ toAddress: email, category: "engagement", subject, text, html, templateCode: "member_invite" })
  return { ok: res.messageId !== null || res.reason === "suppressed" }
}

/** Attribute a new signup to its inviter, if the ref is a real, distinct user. */
export async function resolveInviter(refId: string | undefined | null, newUserEmail: string): Promise<string | null> {
  if (!refId) return null
  const inviter = await prisma.user.findUnique({ where: { id: refId }, select: { id: true, email: true } })
  if (!inviter) return null
  if (inviter.email.toLowerCase() === newUserEmail.toLowerCase()) return null // no self-referral
  return inviter.id
}
