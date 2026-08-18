import { describe, it, expect } from "vitest"
import { cmsSlugSchema, savePageSchema } from "@/modules/admin/cms"
import { settingKeySchema } from "@/modules/admin/settings"

describe("cmsSlugSchema", () => {
  it("accepts kebab-case", () => {
    expect(cmsSlugSchema.parse("about-us")).toBe("about-us")
    expect(cmsSlugSchema.parse("faq")).toBe("faq")
  })
  it("rejects spaces, uppercase, empty, and symbols", () => {
    for (const bad of ["About Us", "AboutUs", "", "about_us", "a/b"]) {
      expect(() => cmsSlugSchema.parse(bad)).toThrow()
    }
  })
})

describe("savePageSchema", () => {
  it("accepts a valid create (no id) and update (with id)", () => {
    expect(savePageSchema.parse({ slug: "rules", title: "Rules", body: "# Rules" }).id).toBeUndefined()
    const uid = "123e4567-e89b-42d3-a456-426614174000"
    expect(savePageSchema.parse({ id: uid, slug: "rules", title: "Rules", body: "" }).id).toBe(uid)
  })
  it("rejects empty title, over-long title, non-kebab slug, non-uuid id", () => {
    expect(() => savePageSchema.parse({ slug: "rules", title: "", body: "" })).toThrow()
    expect(() => savePageSchema.parse({ slug: "rules", title: "x".repeat(201), body: "" })).toThrow()
    expect(() => savePageSchema.parse({ slug: "Bad Slug", title: "t", body: "" })).toThrow()
    expect(() => savePageSchema.parse({ id: "not-a-uuid", slug: "rules", title: "t", body: "" })).toThrow()
  })
})

describe("settingKeySchema", () => {
  it("accepts section-like keys", () => {
    for (const k of ["general", "membership", "email.smtp", "payments-live"]) {
      expect(settingKeySchema.parse(k)).toBe(k)
    }
  })
  it("rejects empty and spaces", () => {
    expect(() => settingKeySchema.parse("")).toThrow()
    expect(() => settingKeySchema.parse("has space")).toThrow()
  })
})
