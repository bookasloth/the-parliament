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

export const SEED_TEMPLATES: SeedTemplate[] = [
  {
    code: "auth.signup_verify",
    category: "transactional",
    subject: "Verify your NNAWCA account",
    variables: { firstName: "string", verifyUrl: "string" },
    text: "Hi {{firstName}},\n\nVerify your email to activate your NNAWCA account: {{verifyUrl}}\n\nThis link expires in 24 hours.",
    html: emailShell({
      accent: "blue",
      pill: "Verify",
      eyebrow: "Account · Security",
      heading: "Confirm your email",
      body:
        p("Hi {{firstName}}, confirm your email address to activate your NNAWCA account.") +
        button("Verify email", "{{verifyUrl}}", "blue") +
        small("This link expires in 24 hours. Didn't sign up? You can ignore this email."),
      reason: "This is a transactional message about your account.",
    }),
  },
  {
    code: "auth.password_reset",
    category: "transactional",
    subject: "Reset your NNAWCA password",
    variables: { firstName: "string", resetUrl: "string" },
    text: "Hi {{firstName}},\n\nReset your password: {{resetUrl}}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.",
    html: emailShell({
      accent: "blue",
      pill: "Security",
      eyebrow: "Account · Security",
      heading: "Reset your password",
      body:
        p("Hi {{firstName}}, use the button below to set a new password.") +
        button("Reset password", "{{resetUrl}}", "blue") +
        small("This link expires in 1 hour. If you didn't request it, you can safely ignore this email."),
      reason: "This is a transactional message about your account.",
    }),
  },
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
    text: "Hi {{firstName}},\n\nWelcome to Alumni Associate.\n\nYou now have full directory access, can post job openings/referrals, join private groups, get 10% off paid events, and list one business.\n\nNext renewal: {{renewalDate}}\nManage plan: {{manageUrl}}",
    html: emailShell({
      accent: "navy",
      pill: "Associate",
      eyebrow: "Membership · Associate",
      heading: "Welcome to Associate, {{firstName}}",
      body:
        p("You're now an Alumni Associate of NNAWCA. Here's what's yours from today:") +
        bullets([
          "Full alumni directory access",
          "Post job openings & referrals",
          "Join private groups",
          "10% off paid events",
          "List one business in the directory",
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
    text: "Hi {{firstName}},\n\nWelcome to Alumni Premium.\n\nNew in Premium: mentorship programme access, up to 3 business listings, highlighted profile to students, recognition on the website and at events, Scholarship Supporters Wall, and a yearly Certificate of Contribution.\n\nNext renewal: {{renewalDate}}\nManage plan: {{manageUrl}}",
    html: emailShell({
      accent: "navy",
      pill: "Premium",
      eyebrow: "Membership · Premium",
      heading: "Welcome to Premium, {{firstName}}",
      body:
        p("You're now an Alumni Premium member. Here's what's new for you over Associate:") +
        bullets([
          "Apply to become a mentor",
          "List up to 3 businesses",
          "Highlighted profile to students",
          "Recognition on the NNAWCA website & at events",
          "Your name on the Scholarship Supporters Wall",
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
    text: "Hi {{firstName}},\n\nWelcome to Life Membership. This is a permanent contribution — your benefits never lapse.\n\nYou're eligible for Committee invitation, your name will be on the Scholarship Supporters Wall, and you'll receive a Certificate of Contribution every year.\n\nView your profile: {{profileUrl}}",
    html: emailShell({
      accent: "gold",
      pill: "Life Member",
      eyebrow: "Membership · Life",
      heading: "Welcome, Life Member",
      body:
        p("{{firstName}}, you've made a <strong>permanent</strong> contribution to NNAWCA — the one that never lapses. Here's what's yours for good:") +
        bullets([
          "Eligibility for Committee invitation",
          "Your name on the Scholarship Supporters Wall",
          "A Certificate of Contribution, every year",
          "Everything in Premium — for life",
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
        p("Hi {{firstName}}, your {{planName}} membership expires in 7 days. Renew now to keep directory access, mentorship, and your highlighted profile.") +
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
]
