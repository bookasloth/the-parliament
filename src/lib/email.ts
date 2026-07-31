import { emailShell, p, small, button, details, codeBox } from "@/lib/email-layout"
import { deliver } from "@/modules/email/service"
import type { EmailCategory } from "@/modules/email/templates"

type EmailTemplate<T> = {
  subject: (data: T) => string
  text: (data: T) => string
  html: (data: T) => string
}

export type EmailTemplates = {
  email_verification: { legalName: string; code: string }
  email_verify_link: { legalName: string; verifyUrl: string }
  password_reset: { legalName: string; resetUrl: string; isNew: boolean }
  payment_receipt: { legalName: string; planName: string; amountInr: string; invoiceUrl: string; invoiceNumber: string }
  verification_approved: { legalName: string; loginUrl: string }
  verification_rejected: { legalName: string; reason: string }
  new_follower: { fromName: string; profileUrl: string }
  comment_on_post: { fromName: string; postUrl: string }
  reaction_on_post: { fromName: string; postUrl: string }
  mention: { fromName: string; postUrl: string }
  contact_reveal_request: { fromName: string; profileUrl: string }
  new_event_in_batch: { eventTitle: string; eventUrl: string }
}

// Engagement/lifecycle mail links to the member's email-preference page. These
// aren't tokenised one-click unsubscribes (that's the modules/email queue's job)
// — just an honest path to turn the category off.
const MANAGE_URL = `${process.env.AUTH_URL || "https://nnawca.org"}/settings/email`

const templates: { [K in keyof EmailTemplates]: EmailTemplate<EmailTemplates[K]> } = {
  email_verification: {
    subject: () => "Your NNAWCA verification code",
    text: (d) =>
      `Hi ${d.legalName},\n\nYour email verification code is: ${d.code}\n\nEnter it to confirm your email. It expires in 15 minutes. If you didn't request this, ignore this email.`,
    html: (d) =>
      emailShell({
        accent: "blue",
        pill: "Verify",
        eyebrow: "Account · Security",
        heading: "Confirm your email",
        body:
          p(`Hi ${d.legalName}, use this one-time code to activate your NNAWCA account.`) +
          codeBox(d.code) +
          small("The code expires in <strong>15 minutes</strong>. Didn't request it? You can safely ignore this email — nothing will change."),
        reason: "This is a transactional message about your account.",
      }),
  },
  email_verify_link: {
    subject: () => "Confirm your NNAWCA email",
    text: (d) =>
      `Hi ${d.legalName},\n\nConfirm your email to activate your account:\n${d.verifyUrl}\n\nThis link expires in 24 hours. If you didn't sign up, ignore this email.`,
    html: (d) =>
      emailShell({
        accent: "blue",
        pill: "Verify",
        eyebrow: "Account · Security",
        heading: "Confirm your email",
        body:
          p(`Hi ${d.legalName}, confirm your email address to activate your NNAWCA account.`) +
          button("Confirm my email", d.verifyUrl, "blue") +
          small("This link expires in 24 hours. If you didn't sign up, you can ignore this email."),
        reason: "This is a transactional message about your account.",
      }),
  },
  password_reset: {
    subject: (d) => (d.isNew ? "Set your NNAWCA password" : "Reset your NNAWCA password"),
    text: (d) =>
      `Hi ${d.legalName},\n\n${d.isNew ? "Welcome to The Parliament. Set your password to activate your account:" : "Reset your password:"}\n${d.resetUrl}\n\nThis link expires soon. If you didn't request this, ignore this email.`,
    html: (d) =>
      emailShell({
        accent: "blue",
        pill: "Security",
        eyebrow: "Account · Security",
        heading: d.isNew ? "Activate your account" : "Reset your password",
        body:
          p(`Hi ${d.legalName}, ${d.isNew ? "set a password to start using The Parliament." : "use the button below to set a new password."}`) +
          button(d.isNew ? "Set my password" : "Reset password", d.resetUrl, "blue") +
          small("This link expires soon. If you didn't request it, you can safely ignore this email."),
        reason: "This is a transactional message about your account.",
      }),
  },
  payment_receipt: {
    subject: () => "Your NNAWCA contribution is confirmed",
    text: (d) =>
      `Hi ${d.legalName},\n\nThank you for your contribution to NNAWCA.\n\nPlan: ${d.planName}\nAmount: INR ${d.amountInr}\nInvoice: ${d.invoiceNumber}\nDownload: ${d.invoiceUrl}\n\nThis is a non-refundable contribution to NNAWCA. Keep this receipt for your records.`,
    html: (d) =>
      emailShell({
        accent: "emerald",
        pill: "Receipt",
        eyebrow: "Payment · Confirmed",
        heading: "Your contribution is confirmed",
        body:
          p(`Hi ${d.legalName}, thank you for your contribution to NNAWCA. Here's your receipt for your records.`) +
          details(
            [
              ["Plan", d.planName],
              ["Amount", `₹${d.amountInr}`],
              ["Invoice", d.invoiceNumber],
            ],
            "emerald",
          ) +
          button("Download invoice", d.invoiceUrl, "emerald") +
          small("This is a non-refundable contribution to NNAWCA. Keep this receipt for your records."),
        reason: "This is a transactional receipt for your payment.",
      }),
  },
  verification_approved: {
    subject: () => "You're a Verified Alumnus of NNAWCA",
    text: (d) =>
      `Hi ${d.legalName},\n\nYour alumni verification has been approved. Welcome to The Parliament.\n\nSign in: ${d.loginUrl}`,
    html: (d) =>
      emailShell({
        accent: "emerald",
        pill: "Approved",
        eyebrow: "Verification · Approved",
        heading: "You're <em>verified</em>",
        body:
          p(`Welcome, ${d.legalName}. Your alumni verification has been approved — you're now a Verified Alumnus on The Parliament, with the badge to prove it.`) +
          button("Open The Parliament", d.loginUrl, "emerald"),
        reason: "You're getting this because you applied for alumni verification.",
      }),
  },
  verification_rejected: {
    subject: () => "Your NNAWCA verification needs another look",
    text: (d) =>
      `Hi ${d.legalName},\n\nWe couldn't verify your application. Reason: ${d.reason}\n\nYou can re-submit with updated documents from your profile.`,
    html: (d) =>
      emailShell({
        accent: "navy",
        pill: "Verification",
        eyebrow: "Verification · Update needed",
        heading: "Your verification needs another look",
        body:
          p(`Hi ${d.legalName}, we couldn't verify your application just yet.`) +
          details([["Reason", d.reason]], "navy") +
          p(`Re-submit with updated documents from your profile and we'll review it again.`) +
          button("Update my documents", MANAGE_URL.replace("/settings/email", "/profile/edit"), "navy"),
        reason: "You're getting this because you applied for alumni verification.",
      }),
  },
  new_follower: {
    subject: (d) => `${d.fromName} started following you`,
    text: (d) => `${d.fromName} started following you.\n\nView profile: ${d.profileUrl}`,
    html: (d) =>
      emailShell({
        accent: "blue",
        pill: "Network",
        eyebrow: "Network · New follower",
        heading: `<em>${d.fromName}</em> started following you`,
        body: p(`${d.fromName} just followed you on The Parliament. Take a look at their profile and follow back if you'd like.`) + button("View their profile", d.profileUrl, "blue"),
        reason: "You're getting this because you allow network emails.",
        manageUrl: MANAGE_URL,
        unsubscribeUrl: MANAGE_URL,
      }),
  },
  comment_on_post: {
    subject: (d) => `${d.fromName} commented on your post`,
    text: (d) => `${d.fromName} commented on your post: ${d.postUrl}`,
    html: (d) =>
      emailShell({
        accent: "blue",
        pill: "Activity",
        eyebrow: "Feed · New comment",
        heading: `<em>${d.fromName}</em> commented on your post`,
        body: p("Someone's talking about what you shared. Jump in and keep the conversation going.") + button("View the conversation", d.postUrl, "blue"),
        reason: "You're getting this because you allow engagement emails.",
        manageUrl: MANAGE_URL,
        unsubscribeUrl: MANAGE_URL,
      }),
  },
  reaction_on_post: {
    subject: (d) => `${d.fromName} reacted to your post`,
    text: (d) => `${d.fromName} reacted to your post: ${d.postUrl}`,
    html: (d) =>
      emailShell({
        accent: "blue",
        pill: "Activity",
        eyebrow: "Feed · New reaction",
        heading: `<em>${d.fromName}</em> reacted to your post`,
        body: p("Your post is getting attention from the alumni community.") + button("View your post", d.postUrl, "blue"),
        reason: "You're getting this because you allow engagement emails.",
        manageUrl: MANAGE_URL,
        unsubscribeUrl: MANAGE_URL,
      }),
  },
  mention: {
    subject: (d) => `${d.fromName} mentioned you`,
    text: (d) => `${d.fromName} mentioned you in a post: ${d.postUrl}`,
    html: (d) =>
      emailShell({
        accent: "blue",
        pill: "Mention",
        eyebrow: "Feed · Mention",
        heading: `<em>${d.fromName}</em> mentioned you`,
        body: p(`${d.fromName} tagged you in a post. See what it's about.`) + button("Open the post", d.postUrl, "blue"),
        reason: "You're getting this because you allow engagement emails.",
        manageUrl: MANAGE_URL,
        unsubscribeUrl: MANAGE_URL,
      }),
  },
  contact_reveal_request: {
    subject: (d) => `${d.fromName} asked to exchange contact info`,
    text: (d) => `${d.fromName} would like to exchange contact info.\n\nReview: ${d.profileUrl}`,
    html: (d) =>
      emailShell({
        accent: "navy",
        pill: "Request",
        eyebrow: "Directory · Contact request",
        heading: `<em>${d.fromName}</em> wants to exchange contact info`,
        body: p(`${d.fromName} has asked to share contact details with you. You decide whether to accept.`) + button("Review the request", d.profileUrl, "navy"),
        reason: "You're getting this because you allow directory emails.",
        manageUrl: MANAGE_URL,
        unsubscribeUrl: MANAGE_URL,
      }),
  },
  new_event_in_batch: {
    subject: (d) => `New event for your batch: ${d.eventTitle}`,
    text: (d) => `${d.eventTitle}\n\nView: ${d.eventUrl}`,
    html: (d) =>
      emailShell({
        accent: "navy",
        pill: "Event",
        eyebrow: "Events · For your batch",
        heading: `<em>${d.eventTitle}</em>`,
        body: p("A new event was just scheduled for your batch. Have a look and RSVP if you can make it.") + button("View the event", d.eventUrl, "navy"),
        reason: "You're getting this because you allow event emails for your batch.",
        manageUrl: MANAGE_URL,
        unsubscribeUrl: MANAGE_URL,
      }),
  },
}

/** Render a template to its subject/text/html without sending. Pure — for tests + previews. */
export function renderEmail<K extends keyof EmailTemplates>(
  template: K,
  data: EmailTemplates[K],
): { subject: string; text: string; html: string } {
  const tpl = templates[template]
  return { subject: tpl.subject(data), text: tpl.text(data), html: tpl.html(data) }
}

export const EMAIL_TEMPLATE_KEYS = Object.keys(templates) as (keyof EmailTemplates)[]

// Every code template's email category — decides opt-out behaviour + From address
// + quiet-hours in deliver(). Account/security mail is transactional (unblockable);
// feed/network mail is engagement (respects opt-out).
export const EMAIL_CATEGORY: Record<keyof EmailTemplates, EmailCategory> = {
  email_verification: "transactional",
  email_verify_link: "transactional",
  password_reset: "transactional",
  payment_receipt: "transactional",
  verification_approved: "transactional",
  verification_rejected: "transactional",
  new_follower: "engagement",
  comment_on_post: "engagement",
  reaction_on_post: "engagement",
  mention: "engagement",
  contact_reveal_request: "engagement",
  new_event_in_batch: "engagement",
}

/**
 * Send a code-rendered template through the single guarded path (deliver): every
 * send now enforces suppression, per-user opt-out, quiet-hours and logging — the
 * same guarantees the DB-template queueEmail already had. Pass `userId` so opt-out
 * and message linkage work (optional; suppression still applies without it).
 */
export async function sendEmail<K extends keyof EmailTemplates>(
  template: K,
  to: string,
  data: EmailTemplates[K],
  userId?: string,
): Promise<void> {
  const { subject, text, html } = renderEmail(template, data)
  await deliver({
    toAddress: to,
    userId,
    category: EMAIL_CATEGORY[template],
    templateCode: `code.${template}`,
    subject,
    text,
    html,
  })
}
