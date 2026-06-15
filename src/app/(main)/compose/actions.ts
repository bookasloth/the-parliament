"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import { getDefaultSchoolId } from "@/lib/school"
import { createPost, type PostFormat } from "@/modules/feed/posts"

const VALID_FORMATS: PostFormat[] = ["text", "image", "link", "quote"]

export async function createPostAction(input: {
  body: string
  categoryKey: string
  format?: string
}) {
  const user = await requireUser()
  const schoolId = await getDefaultSchoolId()
  if (!schoolId) throw new Error("No school configured")

  const format = (VALID_FORMATS.includes(input.format as PostFormat)
    ? (input.format as PostFormat)
    : "text") as PostFormat

  await createPost({
    authorId: user.id,
    schoolId,
    categoryKey: input.categoryKey || "career_update",
    format,
    body: input.body,
  })

  revalidatePath("/feed")
  redirect("/feed")
}
