"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import { getDefaultSchoolId } from "@/lib/school"
import { createPost, publishDraft, deletePost, type PostFormat } from "@/modules/feed/posts"
import { getCurrent } from "@/modules/membership/service"
import { publicUrlFor, validatePostMedia } from "@/lib/r2"

const VALID_FORMATS: PostFormat[] = ["text", "image", "link", "quote", "question", "poll"]

export async function createPostAction(input: {
  body: string
  categoryKey: string
  format?: string
  linkUrl?: string
  media?: { key: string; type: "image" | "video" }[]
  poll?: { question: string; options: string[] }
  textBg?: string
  quoteSource?: string
  audience?: string
  /** Save as a draft instead of publishing. */
  asDraft?: boolean
}) {
  const user = await requireUser()
  const schoolId = await getDefaultSchoolId()
  if (!schoolId) throw new Error("No school configured")

  // Posting a job opening requires Associate+ (jobs benefit). Enforce here so
  // every caller is gated, not just the composer UI.
  if (input.categoryKey === "job_opening") {
    const current = await getCurrent(user.id)
    if (!current.benefits.jobs) {
      throw new Error("Posting a job opening requires an Associate membership or higher")
    }
  }

  const format = (VALID_FORMATS.includes(input.format as PostFormat)
    ? (input.format as PostFormat)
    : "text") as PostFormat

  // Reject media keys not owned by the caller and any object over the size cap
  // (the presigned PUT can't enforce size and the key is client-supplied).
  await validatePostMedia(user.id, (input.media ?? []).map((m) => m.key))

  const media = (input.media ?? []).map((m) => ({
    key: m.key,
    type: m.type,
    url: publicUrlFor(m.key),
  }))

  // Anonymous is an identity flag (author hidden), not an audience — the post
  // is otherwise public. Map the other audiences to a visibility scope.
  const anonymous = input.audience === "anonymous"
  const visibilityScope =
    anonymous ? "public" : input.audience === "followers" ? "followers" : input.audience === "groups" ? "groups" : "public"

  await createPost({
    authorId: user.id,
    schoolId,
    categoryKey: input.categoryKey || "career_update",
    format,
    body: input.body,
    linkUrl: input.linkUrl,
    media: media.length > 0 ? media : undefined,
    poll: input.poll,
    textBg: input.textBg,
    quoteSource: input.quoteSource,
    isAnonymous: anonymous,
    visibilityScope,
    asDraft: input.asDraft,
  })

  if (input.asDraft) {
    revalidatePath("/compose/drafts")
    redirect("/compose/drafts")
  }
  revalidatePath("/feed")
  redirect("/feed")
}

/** Publish a saved draft. */
export async function publishDraftAction(postId: string) {
  const user = await requireUser()
  await publishDraft({ postId, authorId: user.id })
  revalidatePath("/compose/drafts")
  revalidatePath("/feed")
  redirect("/feed")
}

/** Delete a saved draft (author-owned). */
export async function deleteDraftAction(postId: string) {
  const user = await requireUser()
  await deletePost({ postId, userId: user.id })
  revalidatePath("/compose/drafts")
}
