"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import { getDefaultSchoolId } from "@/lib/school"
import { createPost, publishDraft, deletePost, updateDraft, type PostFormat } from "@/modules/feed/posts"
import { draftSaveMode } from "@/modules/feed/draft-autosave"
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

  // Paid-category gating (e.g. job openings) is enforced inside createPost /
  // publishDraft so every path is covered, not just this action.

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

  const post = await createPost({
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
  redirect(`/feed?new=${post.id}`)
}

/**
 * Autosave the composer draft: create the draft on first save (returns its id),
 * then update that same row on every later save so typing doesn't spawn a new
 * draft per keystroke. Non-redirecting — the composer keeps the returned id.
 */
export async function autosaveDraftAction(
  input: {
    body: string
    categoryKey: string
    format?: string
    linkUrl?: string
    media?: { key: string; type: "image" | "video" }[]
    poll?: { question: string; options: string[] }
    textBg?: string
    quoteSource?: string
    audience?: string
  },
  draftId?: string,
): Promise<{ id: string }> {
  const user = await requireUser()
  const schoolId = await getDefaultSchoolId()
  if (!schoolId) throw new Error("No school configured")

  const format = (VALID_FORMATS.includes(input.format as PostFormat)
    ? (input.format as PostFormat)
    : "text") as PostFormat

  await validatePostMedia(user.id, (input.media ?? []).map((m) => m.key))
  const media = (input.media ?? []).map((m) => ({
    key: m.key,
    type: m.type,
    url: publicUrlFor(m.key),
  }))

  if (draftId && draftSaveMode(draftId) === "update") {
    const r = await updateDraft({
      postId: draftId,
      authorId: user.id,
      body: input.body,
      media,
      linkUrl: format === "link" ? input.linkUrl : undefined,
      quoteSource: format === "quote" ? input.quoteSource : undefined,
      textBg: format === "text" ? input.textBg ?? "" : undefined,
    })
    revalidatePath("/compose/drafts")
    return r
  }

  const post = await createPost({
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
    asDraft: true,
  })
  revalidatePath("/compose/drafts")
  return { id: post.id }
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
