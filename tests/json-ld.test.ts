import { describe, expect, it } from "vitest"
import { serializeJsonLd } from "@/lib/json-ld"

describe("serializeJsonLd", () => {
  it("escapes < > & so a payload can't break out of the script tag", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" })
    expect(out).not.toContain("</script>")
    expect(out).not.toContain("<")
    expect(out).not.toContain(">")
    expect(out).toContain("\\u003c")
    expect(out).toContain("\\u003e")
  })

  it("escapes the JS line/paragraph separators", () => {
    const out = serializeJsonLd({ x: "a b c" })
    expect(out).not.toContain(" ")
    expect(out).not.toContain(" ")
    expect(out).toContain("\\u2028")
    expect(out).toContain("\\u2029")
  })

  it("stays valid JSON that round-trips to the original value", () => {
    const value = {
      name: "R&D <Labs>",
      desc: "line break",
      nested: { website: "https://x.test/?a=1&b=2" },
    }
    expect(JSON.parse(serializeJsonLd(value))).toEqual(value)
  })

  it("leaves safe content untouched", () => {
    expect(serializeJsonLd({ a: "plain text 123" })).toBe(
      '{"a":"plain text 123"}',
    )
  })
})
