import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { isOurPublicUrl } from "@/lib/supabase-storage"

// createComment trusts an image URL only if isOurPublicUrl() accepts it — this is
// the boundary that stops a client attaching an arbitrary third-party image.
describe("isOurPublicUrl (comment image trust boundary)", () => {
  const OLD = process.env.SUPABASE_URL
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://proj.supabase.co"
  })
  afterEach(() => {
    process.env.SUPABASE_URL = OLD
  })

  const base = "https://proj.supabase.co/storage/v1/object/public/avatars/"

  it("accepts an image uploaded to our own bucket (comments/ prefix)", () => {
    expect(isOurPublicUrl(`${base}comments/user-1/abc.png`)).toBe(true)
  })

  it("rejects arbitrary third-party URLs", () => {
    expect(isOurPublicUrl("https://evil.example.com/x.png")).toBe(false)
    expect(isOurPublicUrl("https://proj.supabase.co.evil.com/storage/v1/object/public/avatars/x")).toBe(false)
  })

  it("rejects everything when storage isn't configured", () => {
    delete process.env.SUPABASE_URL
    expect(isOurPublicUrl(`${base}comments/user-1/abc.png`)).toBe(false)
  })
})
