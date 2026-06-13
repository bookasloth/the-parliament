import nodemailer from "nodemailer"

type EmailTemplate<T> = {
  subject: (data: T) => string
  text: (data: T) => string
  html: (data: T) => string
}

export type EmailTemplates = {
  verification_approved: { legalName: string; loginUrl: string }
  verification_rejected: { legalName: string; reason: string }
  connection_request: { fromName: string; profileUrl: string }
  comment_on_post: { fromName: string; postUrl: string }
  reaction_on_post: { fromName: string; postUrl: string }
  mention: { fromName: string; postUrl: string }
  contact_reveal_request: { fromName: string; profileUrl: string }
  new_event_in_batch: { eventTitle: string; eventUrl: string }
}

const baseLayout = (body: string) => `
  <div style="font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:#f3f2ef;padding:32px 0">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:32px">
      <div style="font-weight:700;color:#009ae4;font-size:18px;margin-bottom:24px">NNAWCA · The Parliament</div>
      ${body}
      <hr style="border:0;border-top:1px solid #e5e7eb;margin:32px 0 16px"/>
      <div style="font-size:12px;color:#6b7280">Nagpur Navodaya Alumni Welfare and Charitable Association</div>
    </div>
  </div>
`

const templates: { [K in keyof EmailTemplates]: EmailTemplate<EmailTemplates[K]> } = {
  verification_approved: {
    subject: () => "Your NNAWCA verification was approved",
    text: (d) =>
      `Hi ${d.legalName},\n\nYour alumni verification has been approved. Welcome to The Parliament.\n\nSign in: ${d.loginUrl}`,
    html: (d) =>
      baseLayout(
        `<h2 style="margin:0 0 12px;color:#0f172a">Welcome, ${d.legalName}!</h2>
         <p style="color:#374151">Your alumni verification has been approved. You're now a Verified Alumni on The Parliament.</p>
         <p><a href="${d.loginUrl}" style="display:inline-block;background:#009ae4;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Open The Parliament</a></p>`,
      ),
  },
  verification_rejected: {
    subject: () => "About your NNAWCA verification",
    text: (d) =>
      `Hi ${d.legalName},\n\nWe couldn't verify your application. Reason: ${d.reason}\n\nYou can re-submit with updated documents.`,
    html: (d) =>
      baseLayout(
        `<h2 style="margin:0 0 12px;color:#0f172a">Verification needs another look</h2>
         <p style="color:#374151">Hi ${d.legalName}, we couldn't verify your application.</p>
         <p style="color:#374151"><strong>Reason:</strong> ${d.reason}</p>
         <p style="color:#374151">You can re-submit with updated documents from your profile.</p>`,
      ),
  },
  connection_request: {
    subject: (d) => `${d.fromName} wants to connect`,
    text: (d) => `${d.fromName} sent you a connection request.\n\nView profile: ${d.profileUrl}`,
    html: (d) =>
      baseLayout(
        `<h2 style="margin:0 0 12px;color:#0f172a">${d.fromName} wants to connect</h2>
         <p><a href="${d.profileUrl}" style="color:#009ae4">View their profile</a></p>`,
      ),
  },
  comment_on_post: {
    subject: (d) => `${d.fromName} commented on your post`,
    text: (d) => `${d.fromName} commented on your post: ${d.postUrl}`,
    html: (d) =>
      baseLayout(
        `<p style="color:#374151"><strong>${d.fromName}</strong> commented on your post.</p>
         <p><a href="${d.postUrl}" style="color:#009ae4">View post</a></p>`,
      ),
  },
  reaction_on_post: {
    subject: (d) => `${d.fromName} reacted to your post`,
    text: (d) => `${d.fromName} reacted to your post: ${d.postUrl}`,
    html: (d) =>
      baseLayout(
        `<p style="color:#374151"><strong>${d.fromName}</strong> reacted to your post.</p>
         <p><a href="${d.postUrl}" style="color:#009ae4">View post</a></p>`,
      ),
  },
  mention: {
    subject: (d) => `${d.fromName} mentioned you`,
    text: (d) => `${d.fromName} mentioned you in a post: ${d.postUrl}`,
    html: (d) =>
      baseLayout(
        `<p style="color:#374151"><strong>${d.fromName}</strong> mentioned you in a post.</p>
         <p><a href="${d.postUrl}" style="color:#009ae4">Open post</a></p>`,
      ),
  },
  contact_reveal_request: {
    subject: (d) => `${d.fromName} asked to exchange contact info`,
    text: (d) => `${d.fromName} would like to exchange contact info.\n\nReview: ${d.profileUrl}`,
    html: (d) =>
      baseLayout(
        `<h2 style="margin:0 0 12px;color:#0f172a">Contact exchange request</h2>
         <p style="color:#374151"><strong>${d.fromName}</strong> would like to exchange contact info with you.</p>
         <p><a href="${d.profileUrl}" style="color:#009ae4">Review request</a></p>`,
      ),
  },
  new_event_in_batch: {
    subject: (d) => `New event for your batch: ${d.eventTitle}`,
    text: (d) => `${d.eventTitle}\n\nView: ${d.eventUrl}`,
    html: (d) =>
      baseLayout(
        `<h2 style="margin:0 0 12px;color:#0f172a">${d.eventTitle}</h2>
         <p style="color:#374151">A new event was scheduled for your batch.</p>
         <p><a href="${d.eventUrl}" style="color:#009ae4">View event</a></p>`,
      ),
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

export async function sendEmail<K extends keyof EmailTemplates>(
  template: K,
  to: string,
  data: EmailTemplates[K],
): Promise<void> {
  const tpl = templates[template]
  const from = process.env.SMTP_FROM || "NNAWCA <noreply@nnawca.com>"

  if (!process.env.SMTP_HOST) {
    console.log(`[email:dev] ${template} → ${to}`, data)
    return
  }

  await getTransport().sendMail({
    from,
    to,
    subject: tpl.subject(data),
    text: tpl.text(data),
    html: tpl.html(data),
  })
}
