import { getCertificate } from "@/modules/contributions/service"
import { storyImageResponse } from "@/modules/contributions/certificate-assets"

export const dynamic = "force-dynamic"

/** GET /certificate/[id]/story.png — 1080×1920 shareable certificate image. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cert = await getCertificate(id)
  if (!cert) return new Response("Not found", { status: 404 })
  return storyImageResponse(cert)
}
