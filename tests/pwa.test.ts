import { describe, it, expect } from "vitest"
import { detectPlatform } from "@/lib/pwa"

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605 Version/17.0 Mobile/15E148 Safari/604"
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537 Chrome/120 Mobile Safari/537"
const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537 Chrome/120 Safari/537"

describe("detectPlatform", () => {
  it("iOS wins even when a prompt is available (Apple blocks programmatic install)", () => {
    expect(detectPlatform(IPHONE, false)).toBe("ios")
    expect(detectPlatform(IPHONE, true)).toBe("ios")
  })

  it("Android Chromium with a prompt → one-tap install branch", () => {
    expect(detectPlatform(ANDROID, true)).toBe("android-chromium")
  })

  it("desktop Chromium with a prompt → desktop install branch", () => {
    expect(detectPlatform(DESKTOP, true)).toBe("desktop-chromium")
  })

  it("no prompt on a non-iOS browser → fallback (other)", () => {
    expect(detectPlatform(ANDROID, false)).toBe("other")
    expect(detectPlatform(DESKTOP, false)).toBe("other")
  })
})
