import { redirect, notFound } from "next/navigation"
import { optionalUser } from "@/modules/auth/session"
import { getMemberAlbumBySlug } from "@/modules/gallery/service"
import AlbumClient from "./album-client"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getMemberAlbumBySlug(slug)
  return { title: data ? `${data.album.title} — Gallery` : "Album — Gallery" }
}

export default async function AlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const user = await optionalUser()
  if (!user) redirect(`/auth/signin?callbackUrl=/gallery/${slug}`)

  const data = await getMemberAlbumBySlug(slug)
  if (!data) notFound()

  return <AlbumClient album={data.album} initialImages={data.images} viewerId={user.id} isAdmin={Boolean(user.isAdmin)} />
}
