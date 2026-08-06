import { emailShell, p, small, button, details, codeBox, bullets } from "@/lib/email-layout"
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
  new_message: { fromName: string; messagesUrl: string }
  comment_on_post: { fromName: string; postUrl: string }
  reaction_on_post: { fromName: string; postUrl: string }
  mention: { fromName: string; postUrl: string }
  contact_reveal_request: { fromName: string; profileUrl: string }
  new_event_in_batch: { eventTitle: string; eventUrl: string }
  reaction_milestone: { postUrl: string; count: string }
  rsvp_confirmed: { firstName: string; eventTitle: string; eventWhen: string; eventUrl: string }
  membership_renewed: { firstName: string; planName: string; validUntil: string; manageUrl: string }
  birthday_wish: { firstName: string; profileUrl: string }
  upsell_unlock: { firstName: string; membershipUrl: string }
  upsell_upgrade: { firstName: string; planName: string; upgradeUrl: string }
  endorsement_request: { endorserName: string; candidateName: string; endorseUrl: string }
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
      `Hi ${d.legalName},\n\n${d.isNew ? "Welcome to NNAWCA. Set your password to activate your account:" : "Reset your password:"}\n${d.resetUrl}\n\nThis link expires soon. If you didn't request this, ignore this email.`,
    html: (d) =>
      emailShell({
        accent: "blue",
        pill: "Security",
        eyebrow: "Account · Security",
        heading: d.isNew ? "Activate your account" : "Reset your password",
        body:
          p(`Hi ${d.legalName}, ${d.isNew ? "set a password to start using NNAWCA." : "use the button below to set a new password."}`) +
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
      `Hi ${d.legalName},\n\nYour alumni verification has been approved. Welcome to NNAWCA.\n\nSign in: ${d.loginUrl}`,
    html: (d) =>
      emailShell({
        accent: "emerald",
        pill: "Approved",
        eyebrow: "Verification · Approved",
        heading: "You're <em>verified</em>",
        body:
          p(`Welcome, ${d.legalName}. Your alumni verification has been approved — you're now a Verified Alumnus on NNAWCA, with the badge to prove it.`) +
          button("Open NNAWCA", d.loginUrl, "emerald"),
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
        body: p(`${d.fromName} just followed you on NNAWCA. Take a look at their profile and follow back if you'd like.`) + button("View their profile", d.profileUrl, "blue"),
        reason: "You're getting this because you allow network emails.",
        manageUrl: MANAGE_URL,
        unsubscribeUrl: MANAGE_URL,
      }),
  },
  new_message: {
    // Deliberately shows only WHO messaged — never the message content — so the
    // reader has to come back to the site to read it (LinkedIn/Instagram style).
    subject: (d) => `${d.fromName} sent you a message`,
    text: (d) => `${d.fromName} sent you a message on NNAWCA.\n\nRead & reply: ${d.messagesUrl}`,
    html: (d) =>
      emailShell({
        accent: "blue",
        pill: "Messages",
        eyebrow: "Messages · New message",
        heading: `<em>${d.fromName}</em> sent you a message`,
        body: p(`${d.fromName} sent you a message on NNAWCA. Open your inbox to read it and reply.`) + button("Read message", d.messagesUrl, "blue"),
        reason: "You're getting this because someone sent you a direct message.",
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
    subject: (d) => `New alumni event: ${d.eventTitle}`,
    text: (d) => `${d.eventTitle}\n\nView: ${d.eventUrl}`,
    html: (d) =>
      emailShell({
        accent: "navy",
        pill: "Event",
        eyebrow: "Events · New",
        heading: `<em>${d.eventTitle}</em>`,
        body: p("A new event was just scheduled for the NNAWCA alumni network. Have a look and RSVP if you can make it.") + button("View the event", d.eventUrl, "navy"),
        reason: "You're getting this because you allow event emails.",
        manageUrl: MANAGE_URL,
        unsubscribeUrl: MANAGE_URL,
      }),
  },
  reaction_milestone: {
    subject: (d) => `Your post hit ${d.count} reactions 🎉`,
    text: (d) => `Your post is trending — it just crossed ${d.count} reactions.\n\nSee it: ${d.postUrl}`,
    html: (d) =>
      emailShell({
        accent: "blue",
        pill: "Trending",
        eyebrow: "Feed · Milestone",
        heading: `Your post hit <em>${d.count} reactions</em>`,
        body: p(`Your post is resonating with the alumni community — it just crossed <strong>${d.count}</strong> reactions. Nice one.`) + button("See your post", d.postUrl, "blue"),
        reason: "You're getting this because it's about your own post.",
        manageUrl: MANAGE_URL,
        unsubscribeUrl: MANAGE_URL,
      }),
  },
  rsvp_confirmed: {
    subject: (d) => `You're going to ${d.eventTitle}`,
    text: (d) => `Hi ${d.firstName},\n\nYour RSVP is confirmed for ${d.eventTitle}.\nWhen: ${d.eventWhen}\n\nDetails: ${d.eventUrl}`,
    html: (d) =>
      emailShell({
        accent: "emerald",
        pill: "RSVP",
        eyebrow: "Event · Confirmed",
        heading: `You're going to <em>${d.eventTitle}</em>`,
        body:
          p(`Hi ${d.firstName}, your spot is booked — we've saved you a seat.`) +
          details([["When", d.eventWhen]], "emerald") +
          button("View event & details", d.eventUrl, "emerald") +
          small("Plans changed? You can cancel your RSVP from the event page anytime."),
        reason: "You're getting this because you registered for this event.",
      }),
  },
  membership_renewed: {
    subject: () => "Your NNAWCA membership is renewed",
    text: (d) => `Hi ${d.firstName},\n\nYour ${d.planName} membership is renewed — valid until ${d.validUntil}.\n\nManage: ${d.manageUrl}`,
    html: (d) =>
      emailShell({
        accent: "navy",
        pill: "Renewed",
        eyebrow: "Membership · Renewed",
        heading: `Welcome back, <em>${d.firstName}</em>`,
        body:
          p(`Your ${d.planName} membership is renewed — nothing lapsed, everything's exactly where you left it.`) +
          details([["Plan", d.planName], ["Valid until", d.validUntil]], "navy") +
          button("Go to your feed", d.manageUrl, "navy") +
          small("A receipt for this renewal is on its way in a separate email."),
        reason: "You're getting this because you renewed your NNAWCA membership.",
        manageUrl: MANAGE_URL,
        unsubscribeUrl: MANAGE_URL,
      }),
  },
  birthday_wish: {
    subject: (d) => `Happy birthday, ${d.firstName}! 🎂`,
    text: (d) => `Happy birthday, ${d.firstName}!\n\nThe whole NNAWCA alumni family wishes you a wonderful year ahead.\n\n${d.profileUrl}`,
    html: (d) =>
      emailShell({
        accent: "gold",
        pill: "Birthday",
        eyebrow: "From the NNAWCA family",
        heading: `Happy birthday, <em>${d.firstName}</em> 🎂`,
        body:
          p("The whole NNAWCA alumni family wishes you a wonderful year ahead. Thank you for being part of it.") +
          button("Open your profile", d.profileUrl, "gold"),
        reason: "You're getting this because it's your birthday and you're an NNAWCA member.",
        manageUrl: MANAGE_URL,
        unsubscribeUrl: MANAGE_URL,
      }),
  },
  upsell_unlock: {
    subject: () => "Unlock the full NNAWCA alumni network",
    text: (d) => `Hi ${d.firstName},\n\nYou're on the free tier. A membership opens the full directory, groups, job referrals, and event discounts.\n\nChoose a plan: ${d.membershipUrl}`,
    html: (d) =>
      emailShell({
        accent: "blue",
        pill: "Upgrade",
        eyebrow: "Membership · Get full access",
        heading: "You're in — now <em>unlock the rest</em>",
        body:
          p(`Hi ${d.firstName}, your account is on the free tier. A paid membership opens the parts of NNAWCA most alumni join for:`) +
          bullets([
            "Search the full alumni directory",
            "Post & answer job openings and referrals",
            "Join private batch & city groups",
            "10% off every paid event",
            "List your business to alumni",
          ]) +
          button("Choose your plan", d.membershipUrl, "blue") +
          small("Plans start at ₹500/year. Cancel anytime before renewal."),
        reason: "You're getting this because you have a free NNAWCA account.",
        manageUrl: MANAGE_URL,
        unsubscribeUrl: MANAGE_URL,
      }),
  },
  upsell_upgrade: {
    subject: (d) => `Ready for ${d.planName}?`,
    text: (d) => `Hi ${d.firstName},\n\nUpgrade to ${d.planName} for mentorship access, more business listings, a highlighted profile, and recognition.\n\nUpgrade: ${d.upgradeUrl}`,
    html: (d) =>
      emailShell({
        accent: "navy",
        pill: "Upgrade",
        eyebrow: "Membership · Upgrade",
        heading: `Ready for <em>${d.planName}</em>, ${d.firstName}?`,
        body:
          p(`You're getting real value from your membership — ${d.planName} adds the things alumni use to give back and get noticed:`) +
          bullets([
            "Apply to become a student mentor",
            "List more businesses",
            "Your profile highlighted to students",
            "Recognition on the site & at events",
            "Your name on the Scholarship Supporters Wall",
          ]) +
          button(`Upgrade to ${d.planName}`, d.upgradeUrl, "navy") +
          small("You keep your current renewal date."),
        reason: "You're getting this because you're an NNAWCA member.",
        manageUrl: MANAGE_URL,
        unsubscribeUrl: MANAGE_URL,
      }),
  },
  endorsement_request: {
    subject: (d) => `Can you vouch for ${d.candidateName}?`,
    text: (d) =>
      `Hi ${d.endorserName},\n\n${d.candidateName} is verifying their JNV Nagpur alumni status and listed you as someone who studied around the same time.\n\nIf you remember them, endorse them here:\n${d.endorseUrl}\n\nYou'll need to sign in to NNAWCA. This link expires in 30 days.`,
    html: (d) =>
      emailShell({
        accent: "blue",
        pill: "Endorsement",
        eyebrow: "Verification · Peer endorsement",
        heading: `Can you vouch for <em>${d.candidateName}</em>?`,
        body:
          p(`Hi ${d.endorserName}, ${d.candidateName} is verifying their JNV Nagpur alumni status. As someone who studied around the same time, your word helps us confirm they're the real deal.`) +
          button("Review & endorse", d.endorseUrl, "blue") +
          small("You'll be asked to sign in to NNAWCA first. Don't recognise them? You can decline on the same page. This link expires in 30 days."),
        reason: "You're getting this because an admin asked you to help verify a fellow alumnus.",
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
  new_message: "engagement",
  comment_on_post: "engagement",
  reaction_on_post: "engagement",
  mention: "engagement",
  contact_reveal_request: "engagement",
  new_event_in_batch: "engagement",
  reaction_milestone: "engagement",
  rsvp_confirmed: "transactional",
  membership_renewed: "lifecycle",
  birthday_wish: "wish",
  upsell_unlock: "marketing",
  upsell_upgrade: "marketing",
  endorsement_request: "transactional",
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
