import { describe, it, expect } from "vitest"
import { tokenizeBody } from "@/lib/mention-tokens"

describe("tokenizeBody", () => {
  it("splits a mention out of surrounding text", () => {
    expect(tokenizeBody("hey @shubham welcome")).toEqual([
      { type: "text", value: "hey " },
      { type: "mention", handle: "shubham", value: "@shubham" },
      { type: "text", value: " welcome" },
    ])
  })

  it("does NOT treat an email local-part as a mention", () => {
    const toks = tokenizeBody("mail me@site.com please")
    expect(toks.every((t) => t.type !== "mention")).toBe(true)
  })

  it("links bare URLs", () => {
    const toks = tokenizeBody("see https://nnawca.org/download now")
    expect(toks).toContainEqual({ type: "url", value: "https://nnawca.org/download" })
  })

  it("handles multiple mentions", () => {
    const mentions = tokenizeBody("@anil and @bela").filter((t) => t.type === "mention")
    expect(mentions.map((m) => (m.type === "mention" ? m.handle : ""))).toEqual(["anil", "bela"])
  })

  it("ignores a lone '@' with no handle (min 2 chars, matches server rule)", () => {
    expect(tokenizeBody("email @ me").every((t) => t.type !== "mention")).toBe(true)
  })

  it("plain text with no tokens returns a single text run", () => {
    expect(tokenizeBody("just words")).toEqual([{ type: "text", value: "just words" }])
  })

  it("empty string yields no tokens", () => {
    expect(tokenizeBody("")).toEqual([])
  })
})
