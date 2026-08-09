import { getCertificate } from "@/modules/contributions/service"
import { renderStoryPng, pngToPdf } from "@/modules/contributions/certificate-assets"

export const dynamic = "force-dynamic"

/** GET /certificate/[id]/certificate.pdf — downloadable PDF certificate. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cert = await getCertificate(id)
  if (!cert) return new Response("Not found", { status: 404 })

  const pdf = await pngToPdf(await renderStoryPng(cert))
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="nnawca-certificate.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  })
}
