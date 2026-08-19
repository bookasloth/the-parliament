import { requireAdmin } from "@/modules/auth/session"
import { listAlbumsAdmin, listImagesAdmin } from "@/modules/gallery/service"
import GalleryAdminClient from "./gallery-client"

export const dynamic = "force-dynamic"

export default async function AdminGalleryPage() {
  await requireAdmin()
  const [albums, images] = await Promise.all([listAlbumsAdmin(), listImagesAdmin()])
  return <GalleryAdminClient initialAlbums={albums} initialImages={images} />
}
