import { describe, it, expect } from "vitest";
import { isOwnedPostKey } from "@/lib/r2";

// M5: createPost trusts a client-supplied media key, so attach must reject any
// key outside the caller's own posts/<userId>/ prefix.

const me = "11111111-1111-1111-1111-111111111111";
const other = "22222222-2222-2222-2222-222222222222";

describe("isOwnedPostKey", () => {
  it("accepts a key under the caller's own post prefix", () => {
    expect(isOwnedPostKey(me, `posts/${me}/abc.jpg`)).toBe(true);
  });

  it("rejects another user's key (IDOR on referenced media)", () => {
    expect(isOwnedPostKey(me, `posts/${other}/abc.jpg`)).toBe(false);
  });

  it("rejects keys from other buckets/prefixes", () => {
    expect(isOwnedPostKey(me, `avatars/${me}/abc.jpg`)).toBe(false);
    expect(isOwnedPostKey(me, `verification/${me}/id.pdf`)).toBe(false);
  });

  it("rejects prefix-spoofing that doesn't hit the slash boundary", () => {
    // `posts/<me>evil/...` must not pass just because it starts with the id text.
    expect(isOwnedPostKey(me, `posts/${me}evil/abc.jpg`)).toBe(false);
    expect(isOwnedPostKey(me, `../posts/${me}/abc.jpg`)).toBe(false);
  });
});
