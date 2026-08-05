import Link from "next/link"
import { requireUser } from "@/modules/auth/session"
import { listDrafts } from "@/modules/feed/posts"
import DraftsList from "./drafts-list"

export const dynamic = "force-dynamic"

function firstImage(media: unknown): string | null {
  if (!Array.isArray(media)) return null
  for (const m of media) {
    if (m && typeof m === "object") {
      const url = (m as { url?: string; type?: string }).url
      const type = (m as { type?: string }).type
      if (url && type !== "style") return url
    }
  }
  return null
}

export default async function DraftsPage() {
  const user = await requireUser()
  const drafts = await listDrafts(user.id)

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#f3f2ef] pb-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Your drafts</h1>
          <Link
            href="/compose"
            className="rounded-[4px] bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-600"
          >
            New post
          </Link>
        </div>
        <DraftsList
          drafts={drafts.map((d) => ({
            id: d.id,
            format: d.format,
            body: d.body ?? "",
            linkUrl: d.linkUrl ?? null,
            image: firstImage(d.media),
            createdAt: d.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  )
}
