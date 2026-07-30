"use server"

import nodemailer from "nodemailer"

export interface EnquiryState {
  ok: boolean
  error?: string
}

const CONTACT_INBOX = process.env.CONTACT_EMAIL || process.env.SMTP_USER || "contact@nnawca.org"

export async function submitEnquiry(
  _prev: EnquiryState,
  formData: FormData,
): Promise<EnquiryState> {
  const name = String(formData.get("name") || "").trim()
  const email = String(formData.get("email") || "").trim()
  const subject = String(formData.get("subject") || "").trim()
  const message = String(formData.get("message") || "").trim()

  // Honeypot — bots fill this hidden field; humans never see it.
  if (String(formData.get("company") || "")) return { ok: true }

  if (!name || !email || !message) {
    return { ok: false, error: "Please fill in your name, email and message." }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "That email address doesn't look right." }
  }

  const text = `New enquiry from the NNAWCA site\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject || "—"}\n\n${message}`

  // No SMTP configured (local/dev) — log and succeed so the form still works.
  if (!process.env.SMTP_HOST) {
    console.log("[contact:dev]", { name, email, subject, message })
    return { ok: true }
  }

  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "465", 10),
      secure: (process.env.SMTP_PORT || "465") === "465",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
    await transport.sendMail({
      from: process.env.SMTP_FROM || "NNAWCA <noreply@nnawca.com>",
      to: CONTACT_INBOX,
      replyTo: `${name} <${email}>`,
      subject: subject ? `[Enquiry] ${subject}` : `[Enquiry] from ${name}`,
      text,
    })
    return { ok: true }
  } catch (e) {
    console.error("[contact] send failed", e)
    return { ok: false, error: "Something went wrong sending your message. Please email us directly." }
  }
}
