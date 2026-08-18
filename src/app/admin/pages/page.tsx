import { requirePermission } from "@/lib/gate"
import { listPages } from "@/modules/admin/cms"
import PagesClient, { type PageRow } from "./pages-client"

export const dynamic = "force-dynamic"

export default async function AdminPagesPage() {
  await requirePermission("cms:manage")
  const pages = await listPages()

  const rows: PageRow[] = pages.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    status: p.status,
    versionCount: p._count.versions,
    publishedAt: p.publishedAt ? p.publishedAt.toISOString() : null,
    updatedAt: p.updatedAt.toISOString(),
  }))

  return <PagesClient pages={rows} />
}
