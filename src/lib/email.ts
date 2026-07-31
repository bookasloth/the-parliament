import nodemailer from "nodemailer"
import { emailShell, p, small, button, details, codeBox } from "@/lib/email-layout"

type EmailTemplate<T> = {
  subject: (data: T) => string
  text: (data: T) => string
  html: (data: T) => string
}

export type EmailTemplates = {
  email_verification: { legalName: string; code: string }
  email_verify_link: { legalName: string; verifyUrl: string }
  password_reset: { legalName: string; resetUrl: string; isNew: boolean }
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
      baseLayout(
        `<h2 style="margin:0 0 12px;color:#0f172a">Confirm your email</h2>
         <p style="color:#374151">Hi ${d.legalName}, confirm your email address to activate your NNAWCA account.</p>
         <p><a href="${d.verifyUrl}" style="display:inline-block;background:#009ae4;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Confirm my email</a></p>
         <p style="color:#6b7280;font-size:12px">This link expires in 24 hours. If you didn't sign up, ignore this email.</p>`,
      ),
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

let cachedTransport: nodemailer.Transporter | null = null

function getTransport(): nodemailer.Transporter {
  if (cachedTransport) return cachedTransport
  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "465", 10),
    secure: (process.env.SMTP_PORT || "465") === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  return cachedTransport
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

export async function sendEmail<K extends keyof EmailTemplates>(
  template: K,
  to: string,
  data: EmailTemplates[K],
): Promise<void> {
  const from = process.env.SMTP_FROM || "NNAWCA <noreply@nnawca.com>"
  const { subject, text, html } = renderEmail(template, data)

  if (!process.env.SMTP_HOST) {
    console.log(`[email:dev] ${template} → ${to}`, data)
    return
  }

  await getTransport().sendMail({ from, to, subject, text, html })
}
