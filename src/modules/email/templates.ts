import { emailShell, p, small, button, details, bullets } from "@/lib/email-layout"

export type EmailCategory =
  | "transactional"
  | "lifecycle"
  | "reminder"
  | "wish"
  | "engagement"
  | "digest"
  | "admin"
  | "institutional"
  | "marketing"

export interface SeedTemplate {
  code: string
  subject: string
  category: EmailCategory
  html: string
  text: string
  variables: Record<string, string>
}

// Non-transactional mail shows Manage/Unsubscribe in the footer; the queue
// (modules/email/service.ts) injects {{unsubscribeUrl}} at send time.
const MANAGE = "{{unsubscribeUrl}}"

// Auth verify + password-reset mail is sent by the code templates in
// src/lib/email.ts (email_verify_link / password_reset), already wired at signup
// and forgot-password. No DB duplicates here — two sources would double-send.
export const SEED_TEMPLATES: SeedTemplate[] = [
  {
    code: "membership.payment_receipt",
    category: "transactional",
    subject: "Your NNAWCA contribution is confirmed",
    variables: { firstName: "string", planName: "string", amountInr: "string", invoiceUrl: "string", invoiceNumber: "string" },
    text: "Hi {{firstName}},\n\nThank you for your contribution to NNAWCA.\n\nPlan: {{planName}}\nAmount: INR {{amountInr}}\nInvoice: {{invoiceNumber}}\nDownload: {{invoiceUrl}}\n\nThis is a non-refundable contribution to NNAWCA.",
    html: emailShell({
      accent: "emerald",
      pill: "Receipt",
      eyebrow: "Payment · Confirmed",
      heading: "Your contribution is confirmed",
      body:
        p("Hi {{firstName}}, thank you for your contribution to NNAWCA. Here's your receipt for your records.") +
        details(
          [
            ["Plan", "{{planName}}"],
            ["Amount", "₹{{amountInr}}"],
            ["Invoice", "{{invoiceNumber}}"],
          ],
          "emerald",
        ) +
        button("Download invoice", "{{invoiceUrl}}", "emerald") +
        small("This is a non-refundable contribution to NNAWCA. Keep this receipt for your records."),
      reason: "This is a transactional receipt for your payment.",
    }),
  },
  {
    code: "membership.welcome_associate",
    category: "lifecycle",
    subject: "Welcome to Alumni Associate — your benefits inside",
    variables: { firstName: "string", manageUrl: "string", renewalDate: "string" },
    text: "Hi {{firstName}},\n\nWelcome to Alumni Associate.\n\nYou now have the full uncapped feed with reduced ads, can post job openings/referrals, get included video calling (30 min/call), 1 GB gallery storage, and daily-game archive access.\n\nNext renewal: {{renewalDate}}\nManage plan: {{manageUrl}}",
    html: emailShell({
      accent: "navy",
      pill: "Associate",
      eyebrow: "Membership · Associate",
      heading: "Welcome to Associate, {{firstName}}",
      body:
        p("You're now an Alumni Associate of NNAWCA. Here's what's yours from today:") +
        bullets([
          "Full, uncapped alumni feed with reduced ads",
          "Post job openings & referrals",
          "Included video calling — 30 min/call",
          "1 GB photo gallery storage",
          "Daily-game archive access",
        ]) +
        small("Your membership renews on <strong>{{renewalDate}}</strong>.") +
        button("Manage your plan", "{{manageUrl}}", "navy"),
      reason: "You're getting this because you joined NNAWCA as an Associate.",
      manageUrl: MANAGE,
      unsubscribeUrl: MANAGE,
    }),
  },
  {
    code: "membership.welcome_premium",
    category: "lifecycle",
    subject: "Welcome to Alumni Premium — you're highlighted",
    variables: { firstName: "string", manageUrl: "string", renewalDate: "string" },
    text: "Hi {{firstName}},\n\nWelcome to Alumni Premium.\n\nNew in Premium: an ad-free feed, a highlighted profile in the directory, list your business, more video calling (60 min/call), 5 GB gallery storage, earlier event invitations, and a yearly Certificate of Contribution.\n\nNext renewal: {{renewalDate}}\nManage plan: {{manageUrl}}",
    html: emailShell({
      accent: "navy",
      pill: "Premium",
      eyebrow: "Membership · Premium",
      heading: "Welcome to Premium, {{firstName}}",
      body:
        p("You're now an Alumni Premium member. Here's what's new for you over Associate:") +
        bullets([
          "An ad-free feed",
          "A highlighted profile in the directory",
          "List your business in the directory",
          "More video calling — 60 min/call",
          "5 GB photo gallery storage",
          "Earlier event invitations",
          "A yearly Certificate of Contribution",
        ]) +
        small("Your membership renews on <strong>{{renewalDate}}</strong>.") +
        button("Manage your plan", "{{manageUrl}}", "navy"),
      reason: "You're getting this because you upgraded to Premium.",
      manageUrl: MANAGE,
      unsubscribeUrl: MANAGE,
    }),
  },
  {
    code: "membership.welcome_life",
    category: "lifecycle",
    subject: "Congratulations — you're now a Life Member of NNAWCA",
    variables: { firstName: "string", profileUrl: "string" },
    text: "Hi {{firstName}},\n\nWelcome to Life Membership. This is a permanent contribution — your benefits never lapse.\n\nYou get everything in Premium for life, the most video calling (90 min/call), 10 GB gallery storage, eligibility for Committee invitation, and a Certificate of Contribution every year.\n\nView your profile: {{profileUrl}}",
    html: emailShell({
      accent: "gold",
      pill: "Life Member",
      eyebrow: "Membership · Life",
      heading: "Welcome, Life Member",
      body:
        p("{{firstName}}, you've made a <strong>permanent</strong> contribution to NNAWCA — the one that never lapses. Here's what's yours for good:") +
        bullets([
          "Everything in Premium — for life",
          "The most video calling — 90 min/call",
          "10 GB photo gallery storage",
          "Eligibility for Committee invitation",
          "A Certificate of Contribution, every year",
        ]) +
        button("Open your profile", "{{profileUrl}}", "gold"),
      reason: "You're getting this because you became a Life Member of NNAWCA.",
      manageUrl: MANAGE,
      unsubscribeUrl: MANAGE,
    }),
  },
  {
    code: "membership.expiry_t_minus_7",
    category: "reminder",
    subject: "Your NNAWCA membership expires in 7 days",
    variables: { firstName: "string", planName: "string", expiresOn: "string", renewUrl: "string" },
    text: "Hi {{firstName}},\n\nYour {{planName}} membership expires on {{expiresOn}} (7 days away).\n\nRenew now: {{renewUrl}}\n\nIf you don't renew, you'll enter a 30-day grace period.",
    html: emailShell({
      accent: "navy",
      pill: "Renewal",
      eyebrow: "Membership · 7 days left",
      heading: "Renew before <em>{{expiresOn}}</em>",
      body:
        p("Hi {{firstName}}, your {{planName}} membership expires in 7 days. Renew now to keep your ad-free feed, included video calling, extra gallery storage, and your highlighted profile.") +
        details(
          [
            ["Plan", "{{planName}}"],
            ["Expires on", "{{expiresOn}}"],
          ],
          "navy",
        ) +
        button("Renew now", "{{renewUrl}}", "navy") +
        small("Miss the date and you enter a 30-day grace period before reverting to Student."),
      reason: "You're getting this reminder about your NNAWCA membership.",
      manageUrl: MANAGE,
      unsubscribeUrl: MANAGE,
    }),
  },
  {
    code: "membership.yearly_certificate",
    category: "lifecycle",
    subject: "Your NNAWCA Certificate of Contribution — {{fiscalYear}}",
    variables: { firstName: "string", planName: "string", fiscalYear: "string", certificateUrl: "string" },
    text: "Hi {{firstName}},\n\nThank you for your {{planName}} contribution to NNAWCA. Your Certificate of Contribution for {{fiscalYear}} is ready.\n\nDownload it: {{certificateUrl}}",
    html: emailShell({
      accent: "gold",
      pill: "Certificate",
      eyebrow: "Membership · Certificate of Contribution",
      heading: "Your {{fiscalYear}} certificate is ready",
      body:
        p("Thank you, {{firstName}}, for your <strong>{{planName}}</strong> contribution to NNAWCA. Your Certificate of Contribution for {{fiscalYear}} is ready to download.") +
        button("Download certificate", "{{certificateUrl}}", "gold") +
        small("This link is personal to you and opens your certificate PDF."),
      reason: "You're getting this because you're a contributing member of NNAWCA.",
      manageUrl: MANAGE,
      unsubscribeUrl: MANAGE,
    }),
  },
]
