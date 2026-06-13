import { prisma } from "@/lib/prisma"
import { deleteObject, getSignedReadUrl } from "@/lib/r2"
import { audit } from "@/lib/audit"
import { academicYearFor } from "@/lib/membership-cycle"
import { PLANS, type PlanCode } from "@/config/membership"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

interface IssueInvoiceInput {
  orderId: string
}

export async function issueInvoiceForOrder(input: IssueInvoiceInput) {
  const existing = await prisma.membershipInvoice.findUnique({
    where: { orderId: input.orderId },
  })
  if (existing) return existing

  const order = await prisma.membershipOrder.findUnique({
    where: { id: input.orderId },
    include: {
      user: { select: { id: true, legalName: true, email: true } },
    },
  })
  if (!order) throw new Error("Order not found")
  if (order.status !== "paid") throw new Error("Order not paid")

  const issuedAt = new Date()
  const invoiceNumber = await nextInvoiceNumber(issuedAt)
  const pdfBytes = renderInvoicePdf({
    invoiceNumber,
    issuedAt,
    userName: order.user.legalName,
    userEmail: order.user.email,
    planCode: order.planCode as PlanCode,
    amountPaise: order.amountPaise,
    gstAmountPaise: null,
    razorpayPaymentId: order.razorpayPaymentId,
  })

  const key = `invoices/${order.user.id}/${invoiceNumber.replace(/\//g, "_")}.pdf`
  await uploadPdf(key, pdfBytes)

  const created = await prisma.membershipInvoice.create({
    data: {
      orderId: order.id,
      userId: order.userId,
      invoiceNumber,
      amountPaise: order.amountPaise,
      gstAmountPaise: null,
      pdfKey: key,
      issuedAt,
    },
  })

  await audit({
    actorId: order.userId,
    action: "membership.invoice.issued",
    entityType: "membership_invoice",
    entityId: created.id,
    payload: { orderId: order.id, invoiceNumber },
  })

  return created
}

async function nextInvoiceNumber(date: Date): Promise<string> {
  const { startYear, endYear } = academicYearFor(date)
  const fiscalYear = `${startYear}-${String(endYear).slice(-2)}`
  const yearStart = new Date(startYear, 3, 1)
  const yearEnd = new Date(endYear, 3, 1)

  const lastInYear = await prisma.membershipInvoice.findFirst({
    where: { issuedAt: { gte: yearStart, lt: yearEnd } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  })

  const seq = lastInYear ? (parseInt(lastInYear.invoiceNumber.split("/").pop() ?? "0", 10) + 1) : 1
  return `NNAWCA/${fiscalYear}/${String(seq).padStart(6, "0")}`
}

async function uploadPdf(key: string, body: Uint8Array): Promise<void> {
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

interface InvoiceData {
  invoiceNumber: string
  issuedAt: Date
  userName: string
  userEmail: string
  planCode: PlanCode
  amountPaise: number
  gstAmountPaise: number | null
  razorpayPaymentId: string | null
}

function renderInvoicePdf(data: InvoiceData): Uint8Array {
  const planName = PLANS[data.planCode].displayName
  const amountInr = (data.amountPaise / 100).toFixed(2)
  const gstLine = data.gstAmountPaise !== null
    ? `\nGST: INR ${(data.gstAmountPaise / 100).toFixed(2)}`
    : ""

  const content = [
    "BT",
    "/F1 14 Tf",
    "50 760 Td",
    `(NNAWCA Invoice ${data.invoiceNumber}) Tj`,
    "0 -24 Td",
    "/F1 10 Tf",
    `(Issued ${data.issuedAt.toISOString().slice(0, 10)}) Tj`,
    "0 -24 Td",
    `(Member: ${escapePdf(data.userName)}) Tj`,
    "0 -16 Td",
    `(Email: ${escapePdf(data.userEmail)}) Tj`,
    "0 -32 Td",
    "/F1 12 Tf",
    `(Plan: ${escapePdf(planName)}) Tj`,
    "0 -16 Td",
    `(Amount: INR ${amountInr}${escapePdf(gstLine)}) Tj`,
    data.razorpayPaymentId ? `0 -16 Td (Razorpay Payment: ${escapePdf(data.razorpayPaymentId)}) Tj` : "",
    "0 -32 Td",
    "/F1 9 Tf",
    "(This is a non-refundable contribution to NNAWCA.) Tj",
    "ET",
  ].filter(Boolean).join("\n")

  const objects: string[] = []
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj")
  objects.push("2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj")
  objects.push("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj")
  objects.push(`4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj`)
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj")

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

export async function getInvoiceUrl(invoiceId: string, viewerId: string): Promise<string | null> {
  const inv = await prisma.membershipInvoice.findUnique({
    where: { id: invoiceId },
    select: { userId: true, pdfKey: true },
  })
  if (!inv || inv.userId !== viewerId || !inv.pdfKey) return null
  return getSignedReadUrl(inv.pdfKey, 60 * 10)
}

export async function deleteInvoice(invoiceId: string): Promise<void> {
  const inv = await prisma.membershipInvoice.findUnique({ where: { id: invoiceId } })
  if (!inv) return
  if (inv.pdfKey) await deleteObject(inv.pdfKey)
  await prisma.membershipInvoice.delete({ where: { id: invoiceId } })
}
