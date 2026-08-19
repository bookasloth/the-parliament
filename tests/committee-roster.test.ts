import { describe, it, expect } from "vitest"
import { mapRosterMember, storagePathFromUrl } from "@/modules/committee/roster"

const row = {
  id: "r1", name: "Asha Kale", position: "President", groupType: "executive",
  profileLink: "https://x/asha", email: "a@x.org", phone: "+91 99", photoUrl: "https://x/a.jpg",
  displayOrder: 2, isPublished: true,
}

describe("mapRosterMember", () => {
  it("maps photoUrl -> photo and passes fields through", () => {
    const m = mapRosterMember(row)
    expect(m.photo).toBe("https://x/a.jpg")
    expect(m).toMatchObject({ name: "Asha Kale", position: "President", groupType: "executive", email: "a@x.org", phone: "+91 99", profileLink: "https://x/asha" })
  })

  it("coerces an unknown group to executive, keeps advisory", () => {
    expect(mapRosterMember({ ...row, groupType: "advisory" }).groupType).toBe("advisory")
    expect(mapRosterMember({ ...row, groupType: "weird" }).groupType).toBe("executive")
  })

  it("preserves nulls (no photo/email/phone)", () => {
    const m = mapRosterMember({ ...row, photoUrl: null, email: null, phone: null, profileLink: null })
    expect(m.photo).toBeNull()
    expect(m.email).toBeNull()
  })
})

describe("storagePathFromUrl", () => {
  it("extracts the object path from a public bucket URL", () => {
    expect(storagePathFromUrl("https://p.supabase.co/storage/v1/object/public/avatars/committee/president-ab12.jpg"))
      .toBe("committee/president-ab12.jpg")
  })
  it("returns null for a non-matching URL", () => {
    expect(storagePathFromUrl("https://example.com/x.jpg")).toBeNull()
  })
})
