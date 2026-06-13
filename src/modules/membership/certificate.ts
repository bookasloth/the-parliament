import { prisma } from "@/lib/prisma"
import { audit } from "@/lib/audit"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { academicYearFor } from "@/lib/membership-cycle"
import { PLANS, type PlanCode } from "@/config/membership"
import { queueEmail } from "@/modules/email/service"

export async function issueYearlyCertificates(now: Date = new Date()): Promise<number> {
  const eligible = await prisma.user.findMany({
    where: {
      status: "active",
      membershipStatus: { in: ["premium", "life", "committee"] },
      deletedAt: null,
    },
    select: { id: true, legalName: true, email: true, membershipStatus: true },
  })

  let issued = 0
  for (const u of eligible) {
    try {
      await issueCertificate({
        userId: u.id,
        legalName: u.legalName,
        email: u.email,
        planCode: u.membershipStatus as PlanCode,
        issuedAt: now,
      })
      issued++
    } catch (e) {
      console.error(`Certificate failed for ${u.id}`, e)
    }
  }

  await audit({
    action: "job.certificate.yearly",
    payload: { eligible: eligible.length, issued, year: now.getFullYear() },
  })
  return issued
}

async function issueCertificate(opts: {
  userId: string
  legalName: string
  email: string
  planCode: PlanCode
  issuedAt: Date
}): Promise<void> {
  const fy = academicYearFor(opts.issuedAt)
  const certKey = `certificates/${opts.userId}/${fy.label}.pdf`
  const pdf = renderCertificatePdf({
    legalName: opts.legalName,
    planName: PLANS[opts.planCode].displayName,
    fiscalYear: `${fy.startYear}-${String(fy.endYear).slice(-2)}`,
    issuedAt: opts.issuedAt,
  })
  await uploadCertificate(certKey, pdf)

  await prisma.membershipEvent.create({
    data: {
      userId: opts.userId,
      type: "certificate_yearly_issued",
      newPlan: opts.planCode,
      metadata: { pdfKey: certKey, fiscalYear: fy.label },
    },
  })

  await queueEmail({
    templateCode: "membership.welcome_premium",
    toAddress: opts.email,
    userId: opts.userId,
    variables: {
      firstName: opts.legalName.split(" ")[0],
      manageUrl: `${process.env.AUTH_URL || ""}/membership`,
      renewalDate: "—",
    },
  })
}

async function uploadCertificate(key: string, body: Uint8Array): Promise<void> {
  const client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  })
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: key,
    Body: body,
    ContentType: "application/pdf",
  }))
}

interface CertData {
  legalName: string
  planName: string
  fiscalYear: string
  issuedAt: Date
}

function renderCertificatePdf(data: CertData): Uint8Array {
  const content = [
    "BT",
    "/F1 28 Tf",
    "180 680 Td",
    "(NNAWCA) Tj",
    "/F1 14 Tf",
    "0 -20 Td",
    "(Certificate of Contribution) Tj",
    "0 -80 Td",
    "/F1 18 Tf",
    `(${escapePdf(data.legalName)}) Tj`,
    "0 -40 Td",
    "/F1 12 Tf",
    `(${escapePdf(data.planName)} - Fiscal Year ${data.fiscalYear}) Tj`,
    "0 -60 Td",
    "/F1 10 Tf",
    "(With deep gratitude for your contribution to the Nagpur Navodaya) Tj",
    "0 -14 Td",
    "(Alumni Welfare and Charitable Association, which funds scholarships,) Tj",
    "0 -14 Td",
    "(welfare drives, events, mentorship, and the Parliament platform.) Tj",
    "0 -80 Td",
    `(Issued ${data.issuedAt.toISOString().slice(0, 10)}) Tj`,
    "ET",
  ].join("\n")

  const objects: string[] = []
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj")
  objects.push("2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj")
  objects.push("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 792 612] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj")
  objects.push(`4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj`)
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj")

  const offsets: number[] = [0]
  let body = "%PDF-1.4\n"
  for (const obj of objects) {
    offsets.push(body.length)
    body += obj + "\n"
  }
  const xrefOffset = body.length
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i <= objects.length; i++) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

  return new TextEncoder().encode(body)
}

function escapePdf(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
}
