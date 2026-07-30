import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { requireUser } from "@/modules/auth/session"
import { getPostById } from "@/modules/feed/query"
import { updatePostAction } from "../../actions"

export const dynamic = "force-dynamic"

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ postId: string }>
}) {
  const { postId } = await params
  const user = await requireUser()

  const result = await getPostById(postId, user.id).catch(() => null)
  if (!result) notFound()
  const { post } = result
  if (post.author.id !== user.id) notFound()

  async function save(formData: FormData) {
    "use server"
    const body = String(formData.get("body") ?? "")
    await updatePostAction(postId, body)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 space-y-4">
      <Link
        href={`/feed/${post.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" /> Cancel
      </Link>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h1 className="text-lg font-semibold text-gray-900 mb-4">Edit post</h1>
        <form action={save} className="space-y-4">
          <textarea
            name="body"
            defaultValue={post.body ?? ""}
            required
            rows={10}
            maxLength={2000}
            className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <div className="flex justify-end gap-2">
            <Link
              href={`/feed/${post.id}`}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
