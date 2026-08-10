import { describe, it, expect } from "vitest"
import { newImpressionIds } from "@/modules/feed/impressions"
import { mergePostCounts } from "@/modules/feed/live-counts"
import { shouldAutosaveDraft, draftSaveMode } from "@/modules/feed/draft-autosave"
import { isPrivateIp, parseUrlSafe, parseOgTags, isBlockedHostname } from "@/lib/og-preview"

// ── Fix 1: viewCount only bumps for genuinely-new impressions ──────────────
describe("newImpressionIds", () => {
  it("returns candidates not already seen", () => {
    expect(newImpressionIds(["a", "b", "c"], ["b"])).toEqual(["a", "c"])
  })
  it("returns nothing when all already seen (re-impression → no double count)", () => {
    expect(newImpressionIds(["a", "b"], ["a", "b"])).toEqual([])
  })
  it("returns all when nothing seen yet", () => {
    expect(newImpressionIds(["a", "b"], [])).toEqual(["a", "b"])
  })
  it("dedupes repeated candidates so a post is counted once", () => {
    expect(newImpressionIds(["a", "a", "b"], [])).toEqual(["a", "b"])
  })
  it("accepts a Set of seen ids", () => {
    expect(newImpressionIds(["a", "b"], new Set(["a"]))).toEqual(["b"])
  })
})

// ── Fix 3: live count merge never clobbers optimistic state ────────────────
describe("mergePostCounts", () => {
  const base = () => [
    { id: "p1", upvotes: 1, downvotes: 0, comments: 2, shares: 0, viewerReaction: "upvote" },
    { id: "p2", upvotes: 5, downvotes: 1, comments: 0, shares: 3, viewerReaction: null },
  ]
  it("updates only the four counters, leaving other fields intact", () => {
    const out = mergePostCounts(base(), [
      { id: "p1", upvoteCount: 9, downvoteCount: 4, commentCount: 7, shareCount: 2 },
    ])
    expect(out[0]).toMatchObject({ upvotes: 9, downvotes: 4, comments: 7, shares: 2, viewerReaction: "upvote" })
  })
  it("preserves the array reference when counts are identical", () => {
    const posts = base()
    const out = mergePostCounts(posts, [
      { id: "p1", upvoteCount: 1, downvoteCount: 0, commentCount: 2, shareCount: 0 },
    ])
    // p1 counts identical → same array reference returned (no re-render churn)
    expect(out).toBe(posts)
  })
  it("returns the same array when fresh is empty", () => {
    const posts = base()
    expect(mergePostCounts(posts, [])).toBe(posts)
  })
  it("ignores ids not present locally", () => {
    const posts = base()
    const out = mergePostCounts(posts, [
      { id: "ghost", upvoteCount: 99, downvoteCount: 99, commentCount: 99, shareCount: 99 },
    ])
    expect(out).toBe(posts)
  })
  it("creates a new object only for the changed post", () => {
    const posts = base()
    const out = mergePostCounts(posts, [
      { id: "p2", upvoteCount: 6, downvoteCount: 1, commentCount: 0, shareCount: 3 },
    ])
    expect(out[0]).toBe(posts[0]) // p1 untouched → same ref
    expect(out[1]).not.toBe(posts[1]) // p2 changed → new object
    expect(out[1].upvotes).toBe(6)
  })
})

// ── Fix 5: autosave create-once-then-update ────────────────────────────────
describe("draftSaveMode", () => {
  it("creates when no draft id yet", () => {
    expect(draftSaveMode(null)).toBe("create")
    expect(draftSaveMode(undefined)).toBe("create")
    expect(draftSaveMode("")).toBe("create")
  })
  it("updates once a draft id exists (no new draft per keystroke)", () => {
    expect(draftSaveMode("draft-123")).toBe("update")
  })
})

describe("shouldAutosaveDraft", () => {
  it("does not autosave in edit mode (never fork a published post)", () => {
    expect(shouldAutosaveDraft({ editing: true, hasContent: true, snapshot: "a", savedSnapshot: "" })).toBe(false)
  })
  it("does not autosave an empty composer", () => {
    expect(shouldAutosaveDraft({ editing: false, hasContent: false, snapshot: "a", savedSnapshot: "" })).toBe(false)
  })
  it("does not re-save unchanged content", () => {
    expect(shouldAutosaveDraft({ editing: false, hasContent: true, snapshot: "x", savedSnapshot: "x" })).toBe(false)
  })
  it("saves when content is present and changed", () => {
    expect(shouldAutosaveDraft({ editing: false, hasContent: true, snapshot: "y", savedSnapshot: "x" })).toBe(true)
  })
})

// ── Fix 2: OG parsing + SSRF rejection (security path) ─────────────────────
describe("isPrivateIp", () => {
  it("blocks loopback / private / link-local IPv4", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.1", "172.16.5.9", "169.254.1.1", "0.0.0.0", "100.64.0.1"]) {
      expect(isPrivateIp(ip)).toBe(true)
    }
  })
  it("allows public IPv4", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.15.0.1", "172.32.0.1"]) {
      expect(isPrivateIp(ip)).toBe(false)
    }
  })
  it("blocks IPv6 loopback / link-local / unique-local + mapped v4", () => {
    for (const ip of ["::1", "::", "fe80::1", "fd00::1", "fc00::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1"]) {
      expect(isPrivateIp(ip)).toBe(true)
    }
  })
  it("allows public IPv6 and mapped public v4", () => {
    expect(isPrivateIp("2606:4700:4700::1111")).toBe(false)
    expect(isPrivateIp("::ffff:8.8.8.8")).toBe(false)
  })
  it("treats non-IP strings as unsafe", () => {
    expect(isPrivateIp("not-an-ip")).toBe(true)
  })
})

describe("isBlockedHostname", () => {
  it("blocks localhost and subdomains", () => {
    expect(isBlockedHostname("localhost")).toBe(true)
    expect(isBlockedHostname("api.localhost")).toBe(true)
    expect(isBlockedHostname("LOCALHOST")).toBe(true)
  })
  it("allows normal hosts", () => {
    expect(isBlockedHostname("example.com")).toBe(false)
  })
})

describe("parseUrlSafe (SSRF gate)", () => {
  it("rejects non-http(s) schemes", () => {
    for (const u of ["ftp://example.com", "file:///etc/passwd", "gopher://x", "javascript:alert(1)", "data:text/html,x"]) {
      expect(parseUrlSafe(u)).toBeNull()
    }
  })
  it("rejects localhost and private/loopback IP literals", () => {
    for (const u of ["http://localhost/x", "http://127.0.0.1/x", "https://10.0.0.5/", "http://[::1]/", "http://169.254.169.254/latest/meta-data"]) {
      expect(parseUrlSafe(u)).toBeNull()
    }
  })
  it("rejects garbage", () => {
    expect(parseUrlSafe("not a url")).toBeNull()
    expect(parseUrlSafe("")).toBeNull()
  })
  it("accepts a normal public https URL", () => {
    const u = parseUrlSafe("https://example.com/article?a=1")
    expect(u).not.toBeNull()
    expect(u?.hostname).toBe("example.com")
  })
})

describe("parseOgTags", () => {
  it("extracts og tags in both attribute orders", () => {
    const html = `
      <meta property="og:title" content="Hello &amp; World" />
      <meta content="A description" property="og:description">
      <meta property="og:image" content="https://cdn.example.com/i.png">
      <meta property="og:site_name" content="Example">
    `
    expect(parseOgTags(html)).toEqual({
      title: "Hello & World",
      description: "A description",
      image: "https://cdn.example.com/i.png",
      siteName: "Example",
    })
  })
  it("falls back to <title> when og:title is absent", () => {
    const html = `<head><title>Bare Title</title></head>`
    const og = parseOgTags(html)
    expect(og.title).toBe("Bare Title")
    expect(og.image).toBeUndefined()
  })
  it("falls back to twitter tags", () => {
    const html = `<meta name="twitter:title" content="TW"><meta name="twitter:image" content="x.jpg">`
    const og = parseOgTags(html)
    expect(og.title).toBe("TW")
    expect(og.image).toBe("x.jpg")
  })
  it("returns all-undefined for HTML with no metadata", () => {
    expect(parseOgTags("<html><body>nothing</body></html>")).toEqual({
      title: undefined,
      description: undefined,
      image: undefined,
      siteName: undefined,
    })
  })
})
