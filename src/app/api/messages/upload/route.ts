import { NextResponse } from "next/server"
import { requireUser } from "@/modules/auth/session"
import { uploadMessageImage, isAllowedImage } from "@/lib/supabase-storage"

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(req: Request) {
  try {
    const user = await requireUser()
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
    const url = await uploadMessageImage(user.id, bytes, file.type)

    return NextResponse.json({ url })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 },
    )
  }
}
