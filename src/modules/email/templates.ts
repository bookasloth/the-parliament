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

const baseLayout = (body: string) => `<div style="font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:#f3f2ef;padding:32px 0">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:32px">
    <div style="font-weight:700;color:#009ae4;font-size:18px;margin-bottom:24px">NNAWCA · The Parliament</div>
    ${body}
    <hr style="border:0;border-top:1px solid #e5e7eb;margin:32px 0 16px"/>
    <div style="font-size:12px;color:#6b7280">Nagpur Navodaya Alumni Welfare and Charitable Association · <a href="{{unsubscribeUrl}}" style="color:#6b7280">Manage preferences</a></div>
  </div>
</div>`

export const SEED_TEMPLATES: SeedTemplate[] = [
  {
    code: "auth.signup_verify",
    category: "transactional",
    subject: "Verify your NNAWCA account",
    variables: { firstName: "string", verifyUrl: "string" },
    text: "Hi {{firstName}},\n\nVerify your email to activate your NNAWCA account: {{verifyUrl}}\n\nThis link expires in 24 hours.",
    html: baseLayout(`<h2 style="margin:0 0 12px;color:#0f172a">Verify your email</h2>
<p style="color:#374151">Hi {{firstName}}, click below to activate your NNAWCA account.</p>
<p><a href="{{verifyUrl}}" style="display:inline-block;background:#009ae4;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Verify email</a></p>
<p style="color:#6b7280;font-size:12px">This link expires in 24 hours.</p>`),
  },
  {
    code: "auth.password_reset",
    category: "transactional",
    subject: "Reset your NNAWCA password",
    variables: { firstName: "string", resetUrl: "string" },
    text: "Hi {{firstName}},\n\nReset your password: {{resetUrl}}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.",
    html: baseLayout(`<h2 style="margin:0 0 12px;color:#0f172a">Reset your password</h2>
<p style="color:#374151">Hi {{firstName}}, click below to set a new password.</p>
<p><a href="{{resetUrl}}" style="display:inline-block;background:#009ae4;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Reset password</a></p>
<p style="color:#6b7280;font-size:12px">This link expires in 1 hour. If you didn't request this, ignore this email.</p>`),
  },
  {
    code: "membership.payment_receipt",
    category: "transactional",
    subject: "Your NNAWCA contribution is confirmed",
    variables: { firstName: "string", planName: "string", amountInr: "string", invoiceUrl: "string", invoiceNumber: "string" },
    text: "Hi {{firstName}},\n\nThank you for your contribution to NNAWCA.\n\nPlan: {{planName}}\nAmount: INR {{amountInr}}\nInvoice: {{invoiceNumber}}\nDownload: {{invoiceUrl}}\n\nThis is a non-refundable contribution to NNAWCA.",
    html: baseLayout(`<h2 style="margin:0 0 12px;color:#0f172a">Contribution confirmed</h2>
<p style="color:#374151">Hi {{firstName}}, thank you for your contribution to NNAWCA.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0">
  <tr><td style="padding:8px 0;color:#6b7280">Plan</td><td style="padding:8px 0;font-weight:600;color:#0f172a">{{planName}}</td></tr>
  <tr><td style="padding:8px 0;color:#6b7280">Amount</td><td style="padding:8px 0;font-weight:600;color:#0f172a">INR {{amountInr}}</td></tr>
  <tr><td style="padding:8px 0;color:#6b7280">Invoice</td><td style="padding:8px 0;font-weight:600;color:#0f172a">{{invoiceNumber}}</td></tr>
</table>
<p><a href="{{invoiceUrl}}" style="display:inline-block;background:#009ae4;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Download invoice</a></p>
<p style="color:#6b7280;font-size:12px">This is a non-refundable contribution to NNAWCA.</p>`),
  },
  {
    code: "membership.welcome_associate",
    category: "lifecycle",
    subject: "Welcome to Alumni Associate — your benefits inside",
    variables: { firstName: "string", manageUrl: "string", renewalDate: "string" },
    text: "Hi {{firstName}},\n\nWelcome to Alumni Associate.\n\nYou now have full directory access, can post job openings/referrals, participate in welfare drives, and join private groups.\n\nNext renewal: {{renewalDate}}\nManage plan: {{manageUrl}}",
    html: baseLayout(`<h2 style="margin:0 0 12px;color:#0f172a">Welcome to Associate, {{firstName}}</h2>
<p style="color:#374151">You're now an Alumni Associate of NNAWCA.</p>
<ul style="color:#374151;padding-left:20px">
<li>Full alumni directory access</li>
<li>Post job openings & referrals</li>
<li>Join private groups</li>
<li>10% off paid events</li>
<li>List one business in directory</li>
</ul>
<p style="color:#6b7280;font-size:12px">Next renewal: {{renewalDate}}</p>
<p><a href="{{manageUrl}}" style="color:#009ae4">Manage plan</a></p>`),
  },
  {
    code: "membership.welcome_premium",
    category: "lifecycle",
    subject: "Welcome to Alumni Premium — you're highlighted",
    variables: { firstName: "string", manageUrl: "string", renewalDate: "string" },
    text: "Hi {{firstName}},\n\nWelcome to Alumni Premium.\n\nNew in Premium: mentorship programme access, business listings (up to 3), highlighted profile to students, recognition on website and at events, Scholarship Supporters Wall, yearly Certificate of Contribution.\n\nNext renewal: {{renewalDate}}\nManage plan: {{manageUrl}}",
    html: baseLayout(`<h2 style="margin:0 0 12px;color:#0f172a">Welcome to Premium, {{firstName}}</h2>
<p style="color:#374151">You're now an Alumni Premium. Here's what's new vs Associate:</p>
<ul style="color:#374151;padding-left:20px">
<li>Apply to be a mentor</li>
<li>List your business (up to 3 listings)</li>
<li>Highlighted profile to students</li>
<li>Recognition on NNAWCA website & at events</li>
<li>Name on Scholarship Supporters Wall</li>
<li>Yearly Certificate of Contribution</li>
</ul>
<p style="color:#6b7280;font-size:12px">Next renewal: {{renewalDate}}</p>
<p><a href="{{manageUrl}}" style="color:#009ae4">Manage plan</a></p>`),
  },
  {
    code: "membership.welcome_life",
    category: "lifecycle",
    subject: "Congratulations — you're now a Life Member of NNAWCA",
    variables: { firstName: "string", profileUrl: "string" },
    text: "Hi {{firstName}},\n\nWelcome to Life Membership. This is a permanent contribution — your benefits never lapse.\n\nYou're eligible for Committee invitation, your name will be on the Scholarship Supporters Wall, and you'll receive a Certificate of Contribution every year.\n\nView your profile: {{profileUrl}}",
    html: baseLayout(`<h2 style="margin:0 0 12px;color:#0f172a">Welcome, Life Member</h2>
<p style="color:#374151">{{firstName}}, you've made a permanent contribution to NNAWCA.</p>
<p style="color:#374151">Your benefits never lapse. You're eligible for Committee invitation. Your name will be on the Scholarship Supporters Wall, and you'll receive a Certificate of Contribution every year.</p>
<p><a href="{{profileUrl}}" style="display:inline-block;background:#0c1d3d;color:#f3d56e;padding:10px 18px;border-radius:8px;text-decoration:none">View your profile</a></p>`),
  },
  {
    code: "membership.expiry_t_minus_7",
    category: "reminder",
    subject: "Your NNAWCA membership expires in 7 days",
    variables: { firstName: "string", planName: "string", expiresOn: "string", renewUrl: "string" },
    text: "Hi {{firstName}},\n\nYour {{planName}} membership expires on {{expiresOn}} (7 days away).\n\nRenew now: {{renewUrl}}\n\nIf you don't renew, you'll enter a 30-day grace period.",
    html: baseLayout(`<h2 style="margin:0 0 12px;color:#0f172a">Renewal in 7 days</h2>
<p style="color:#374151">Hi {{firstName}}, your {{planName}} membership expires on <strong>{{expiresOn}}</strong>.</p>
<p><a href="{{renewUrl}}" style="display:inline-block;background:#009ae4;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Renew now</a></p>
<p style="color:#6b7280;font-size:12px">If you don't renew, you'll enter a 30-day grace period before reverting to Free Member.</p>`),
  },
]
