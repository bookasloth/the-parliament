"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import { getDefaultSchoolId } from "@/lib/school"
import { createPost, type PostFormat } from "@/modules/feed/posts"
import { getCurrent } from "@/modules/membership/service"
import { publicUrlFor } from "@/lib/r2"

const VALID_FORMATS: PostFormat[] = ["text", "image", "link", "quote", "question", "poll"]

export async function createPostAction(input: {
  body: string
  categoryKey: string
  format?: string
  linkUrl?: string
  mediaKeys?: string[]
  poll?: { question: string; options: string[] }
  textBg?: string
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

  const media = (input.mediaKeys ?? []).map((key) => ({
    key,
    type: "image",
    url: publicUrlFor(key),
  }))
  // Text-post background is stashed as a non-image sentinel in media (no url),
  // so image readers (map-row.mediaUrls, detail grid) skip it. Avoids a schema column.
  const styleMedia =
    input.textBg && media.length === 0 ? [{ key: "", type: "style", bg: input.textBg }] : []

  await createPost({
    authorId: user.id,
    schoolId,
    categoryKey: input.categoryKey || "career_update",
    format,
    body: input.body,
    linkUrl: input.linkUrl,
    media: media.length > 0 ? media : styleMedia.length > 0 ? styleMedia : undefined,
    poll: input.poll,
  })

  revalidatePath("/feed")
  redirect("/feed")
}
