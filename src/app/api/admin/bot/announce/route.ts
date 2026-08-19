import { z } from "zod"
import { requireAdmin } from "@/modules/auth/session"
import { handleError, ok, badRequest } from "@/lib/api"
import { botAnnounce } from "@/modules/bot/service"

const schema = z.object({
  body: z.string().trim().min(1, "Announcement body is required").max(5000),
  categoryKey: z.string().trim().min(1).optional(),
  linkUrl: z.string().url().optional(),
})

export async function POST(req: Request) {
  try {
    await requireAdmin()
    const parsed = schema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return badRequest("Validation failed", parsed.error.issues)

    const post = await botAnnounce({
      ...parsed.data,
      format: parsed.data.linkUrl ? "link" : "text",
    })
    if (!post) return badRequest("Bot account or school not set up")
    return ok({ postId: post.id })
  } catch (e) {
    return handleError(e)
  }
}
