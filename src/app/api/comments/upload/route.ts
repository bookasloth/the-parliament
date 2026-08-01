import { NextResponse } from "next/server"
import { requireUser } from "@/modules/auth/session"
import { uploadCommentImage, isAllowedImage } from "@/lib/supabase-storage"
import { enforceRateLimit, RateLimitedError } from "@/lib/rate-limit"

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

// Mirrors /api/messages/upload — direct server-side upload, magic-byte sniffed.
export async function POST(req: Request) {
  try {
    const user = await requireUser()
    await enforceRateLimit({ bucket: "upload.comment", identifier: user.id, limit: 60, windowSec: 3600 })
    const form = await req.formData()
    const file = form.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }
    if (!isAllowedImage(file.type)) {
      return NextResponse.json({ error: "Only PNG, JPEG or WebP images" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const url = await uploadCommentImage(user.id, bytes, file.type)

    return NextResponse.json({ url })
  } catch (e) {
    if (e instanceof RateLimitedError) {
      return NextResponse.json({ error: "Too many uploads, try again later" }, { status: 429 })
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 },
    )
  }
}
