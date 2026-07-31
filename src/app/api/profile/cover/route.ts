import { NextResponse } from "next/server"
import { requireUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { uploadCover, isAllowedImage } from "@/lib/supabase-storage"
import { enforceRateLimit, RateLimitedError } from "@/lib/rate-limit"

const MAX_BYTES = 8 * 1024 * 1024

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    await enforceRateLimit({ bucket: "upload.cover", identifier: user.id, limit: 20, windowSec: 3600 })
    const form = await req.formData()
    const file = form.get("file")
    if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    if (!isAllowedImage(file.type)) return NextResponse.json({ error: "Only PNG, JPEG or WebP images" }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be under 8 MB" }, { status: 400 })

    const bytes = new Uint8Array(await file.arrayBuffer())
    const coverUrl = await uploadCover(user.id, bytes, file.type)

    await prisma.profile.upsert({
      where: { userId: user.id },
      update: { coverUrl },
      create: { userId: user.id, coverUrl },
    })

    return NextResponse.json({ coverUrl })
  } catch (e) {
    if (e instanceof RateLimitedError) {
      return NextResponse.json({ error: "Too many uploads, try again later" }, { status: 429 })
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 500 })
  }
}
