import { notFound } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { getPostById } from "@/modules/feed/query"
import PostComposer, { type ComposerMedia } from "@/components/shared/PostComposer"
import { updatePostAction } from "../../actions"

export const dynamic = "force-dynamic"

// Text-post background sentinel + real media both live in post.media.
function splitMedia(media: unknown): { bg?: string; items: ComposerMedia[] } {
  if (!Array.isArray(media)) return { items: [] }
  let bg: string | undefined
  const items: ComposerMedia[] = []
  for (const m of media) {
    if (!m || typeof m !== "object") continue
    const entry = m as { type?: string; bg?: string; key?: string; url?: string }
    if (entry.type === "style") {
      bg = entry.bg
    } else if (entry.url) {
      items.push({
        key: entry.key ?? "",
        url: entry.url,
        type: entry.type === "video" ? "video" : "image",
      })
    }
  }
  return { bg, items }
}

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

  const { bg, items } = splitMedia(post.media)

  async function save(data: { body: string; media?: { key: string; type: "image" | "video" }[]; textBg?: string }) {
    "use server"
    await updatePostAction(postId, {
      body: data.body,
      media: data.media,
      textBg: data.textBg,
    })
  }

  return (
    <PostComposer
      editing
      title="Edit post"
      submitLabel="Save changes"
      submittingLabel="Saving…"
      onSubmit={save}
      initial={{
        format: post.format,
        body: post.body ?? "",
        bg,
        categoryKey: post.category?.key,
        linkUrl: post.linkUrl ?? undefined,
        media: items,
        poll: post.poll
          ? { question: post.poll.question, options: post.poll.options.map((o) => o.label) }
          : undefined,
      }}
    />
  )
}
