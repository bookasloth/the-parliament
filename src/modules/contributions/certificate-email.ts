import { getTransport, buildMailPayload } from "@/modules/email/service"
import { emailShell, p, button } from "@/lib/email-layout"
import { tierById, rupees } from "@/config/sponsor"
import { renderStoryPng, pngToPdf } from "./certificate-assets"
import type { Certificate } from "./service"

const BASE = process.env.AUTH_URL || "https://nnawca.org"

/**
 * Email the contributor their certificate: a link to the public page plus the
 * PDF and Instagram-story PNG as attachments, so they can share on WhatsApp / IG.
 * Best-effort — a mail failure must never break payment confirmation.
 */
export async function sendCertificateEmail(cert: Certificate, toAddress: string): Promise<void> {
  try {
    const certUrl = `${BASE}/certificate/${cert.id}`
    const pngUrl = `${certUrl}/story.png`
    const pdfUrl = `${certUrl}/certificate.pdf`
    const tierLabel = (tierById(cert.tier) ?? tierById("silver")!).label

    const [png, pdf] = await (async () => {
      const p1 = await renderStoryPng(cert)
      const p2 = await pngToPdf(p1)
      return [p1, p2] as const
    })()

    const html = emailShell({
      accent: "blue",
      pill: "Certificate",
      eyebrow: "Thank you",
      heading: `You're a ${tierLabel} supporter of NNAWCA`,
      body:
        p(`Thank you, <strong>${cert.name}</strong>, for contributing <strong>${rupees(cert.amountPaise)}</strong> to keep the JNV Nagpur alumni platform running.`) +
        p(`Your certificate is attached — a <strong>PDF</strong> and an <strong>Instagram-story image</strong> you can post on WhatsApp status or Instagram. It also lives online at the link below.`) +
        button("View &amp; share your certificate", certUrl, "blue"),
    })

    const text =
      `Thank you, ${cert.name}, for contributing ${rupees(cert.amountPaise)} to NNAWCA.\n\n` +
      `Your certificate: ${certUrl}\nShareable image: ${pngUrl}\nPDF: ${pdfUrl}\n\n` +
      `Share it on WhatsApp or Instagram — thank you for keeping the network alive.`

    const payload = buildMailPayload({
      category: "transactional",
      toAddress,
      subject: "Your NNAWCA contribution certificate",
      text,
      html,
    })

    await getTransport().sendMail({
      ...payload,
      attachments: [
        { filename: "nnawca-certificate.pdf", content: Buffer.from(pdf), contentType: "application/pdf" },
        { filename: "nnawca-certificate-story.png", content: Buffer.from(png), contentType: "image/png" },
      ],
    })
  } catch {
    // best-effort
  }
}
