import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Env is read at import time by src/config/env.ts → set before importing the lib.
describe("normalizeWhatsAppDestination", () => {
  it("strips + and keeps country code", async () => {
    const { normalizeWhatsAppDestination } = await import("@/lib/aisensy")
    expect(normalizeWhatsAppDestination("+919876543210")).toBe("919876543210")
  })
  it("assumes India for a bare 10-digit number", async () => {
    const { normalizeWhatsAppDestination } = await import("@/lib/aisensy")
    expect(normalizeWhatsAppDestination("9876543210")).toBe("919876543210")
  })
  it("keeps a non-India country code when + present", async () => {
    const { normalizeWhatsAppDestination } = await import("@/lib/aisensy")
    expect(normalizeWhatsAppDestination("+1 415 555 0100")).toBe("14155550100")
  })
  it("strips spaces and dashes", async () => {
    const { normalizeWhatsAppDestination } = await import("@/lib/aisensy")
    expect(normalizeWhatsAppDestination("+91 98765-43210")).toBe("919876543210")
  })
  it("rejects too-short and too-long numbers", async () => {
    const { normalizeWhatsAppDestination } = await import("@/lib/aisensy")
    expect(normalizeWhatsAppDestination("12345")).toBeNull()
    expect(normalizeWhatsAppDestination("1234567890123456")).toBeNull()
  })
  it("returns null for empty/nullish", async () => {
    const { normalizeWhatsAppDestination } = await import("@/lib/aisensy")
    expect(normalizeWhatsAppDestination("")).toBeNull()
    expect(normalizeWhatsAppDestination(null)).toBeNull()
    expect(normalizeWhatsAppDestination(undefined)).toBeNull()
  })
})

describe("sendWhatsAppCampaign", () => {
  const baseInput = { campaignName: "utility", destination: "+919876543210", userName: "Asha" }

  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("fail-closed (skipped) when AISENSY_API_KEY unset — never calls fetch", async () => {
    vi.stubEnv("AISENSY_API_KEY", "")
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    const { sendWhatsAppCampaign } = await import("@/lib/aisensy")
    const res = await sendWhatsAppCampaign(baseInput)
    expect(res).toEqual({ ok: false, skipped: true, error: expect.stringContaining("not configured") })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("rejects an invalid destination before sending", async () => {
    vi.stubEnv("AISENSY_API_KEY", "key")
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    const { sendWhatsAppCampaign } = await import("@/lib/aisensy")
    const res = await sendWhatsAppCampaign({ ...baseInput, destination: "123" })
    expect(res.ok).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("posts the campaign payload and returns ok on success", async () => {
    vi.stubEnv("AISENSY_API_KEY", "secret-key")
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, messageId: "wamid.123" }), { status: 200 }),
    )
    vi.stubGlobal("fetch", fetchSpy)
    const { sendWhatsAppCampaign } = await import("@/lib/aisensy")
    const res = await sendWhatsAppCampaign({ ...baseInput, templateParams: ["Asha", "Fri"] })
    expect(res).toEqual({ ok: true, providerMessageId: "wamid.123" })

    const [url, opts] = fetchSpy.mock.calls[0]
    expect(url).toContain("aisensy.com")
    const body = JSON.parse((opts as RequestInit).body as string)
    expect(body).toMatchObject({
      apiKey: "secret-key",
      campaignName: "utility",
      destination: "919876543210",
      userName: "Asha",
      templateParams: ["Asha", "Fri"],
    })
  })

  it("returns an error on non-2xx from AiSensy", async () => {
    vi.stubEnv("AISENSY_API_KEY", "key")
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Campaign not found" }), { status: 400 })),
    )
    const { sendWhatsAppCampaign } = await import("@/lib/aisensy")
    const res = await sendWhatsAppCampaign(baseInput)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain("Campaign not found")
  })

  it("treats { success:false } 200 body as a failure", async () => {
    vi.stubEnv("AISENSY_API_KEY", "key")
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, message: "Invalid params" }), { status: 200 })),
    )
    const { sendWhatsAppCampaign } = await import("@/lib/aisensy")
    const res = await sendWhatsAppCampaign(baseInput)
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain("Invalid params")
  })
})
