import { describe, it, expect } from "vitest"
import { computeApplied, classifyKind, giverWeight, type GuardContext } from "@/modules/karma/ledger"
import { KARMA } from "@/config/karma"

const base: GuardContext = {
  role: "actor",
  self: false,
  likesMade: 0,
  commentsMade: 0,
  sharesMade: 0,
  netKarma: 0,
  pairLikesGiven: 0,
  repeatComment: false,
  mutualDownvote: false,
  giverWeight: 1,
}
const ctx = (o: Partial<GuardContext> = {}): GuardContext => ({ ...base, ...o })

describe("classifyKind", () => {
  it("maps action strings to kinds (order-sensitive)", () => {
    expect(classifyKind("downvote_comment_actor")).toBe("downvote_comment")
    expect(classifyKind("downvote_publisher")).toBe("downvote_post")
    expect(classifyKind("share_actor")).toBe("share")
    expect(classifyKind("comment_actor")).toBe("comment")
    expect(classifyKind("post_like_actor")).toBe("like")
    expect(classifyKind("daily_login")).toBe("other")
  })
})

describe("computeApplied — happy path", () => {
  it("passes base value through under caps", () => {
    expect(computeApplied("like", 1, ctx())).toBe(1)
    expect(computeApplied("comment", 1.5, ctx())).toBe(1.5)
    expect(computeApplied("share", 2, ctx())).toBe(2)
  })
  it("publisher credit is uncapped positive", () => {
    expect(computeApplied("like", 1, ctx({ role: "publisher", likesMade: 999 }))).toBe(1)
  })
})

describe("giver-standing weighting (Sybil blunt)", () => {
  it("halves publisher credit from an untrusted giver", () => {
    expect(computeApplied("like", 1, ctx({ role: "publisher", giverWeight: 0.5 }))).toBe(0.5)
    expect(computeApplied("comment", 2, ctx({ role: "publisher", giverWeight: 0.5 }))).toBe(1)
  })
  it("does not touch negatives", () => {
    expect(computeApplied("downvote_post", -2, ctx({ role: "publisher", giverWeight: 0.5 }))).toBe(-2)
  })
  it("giverWeight(): verified → 1, fresh unverified → reduced, aged → 1", () => {
    const now = new Date("2026-08-02T00:00:00Z")
    expect(giverWeight({ isVerified: true, createdAt: now }, now)).toBe(1)
    expect(giverWeight({ isVerified: false, createdAt: new Date("2026-08-01T00:00:00Z") }, now)).toBe(0.5)
    expect(giverWeight({ isVerified: false, createdAt: new Date("2026-07-01T00:00:00Z") }, now)).toBe(1)
  })
})

describe("self-actions earn nothing positive", () => {
  it("self like → 0", () => {
    expect(computeApplied("like", 1, ctx({ self: true }))).toBe(0)
  })
  it("self negative still applies (no free pass)", () => {
    expect(computeApplied("downvote_post", -0.5, ctx({ self: true }))).toBe(-0.5)
  })
})

describe("daily caps", () => {
  it("like at/over cap → 0 to actor", () => {
    expect(computeApplied("like", 1, ctx({ likesMade: KARMA.DAILY_LIKE_CAP }))).toBe(0)
    expect(computeApplied("like", 1, ctx({ likesMade: KARMA.DAILY_LIKE_CAP - 1 }))).toBe(1)
  })
  it("comment over cap → reduced value, not full", () => {
    expect(computeApplied("comment", 1.5, ctx({ commentsMade: KARMA.DAILY_COMMENT_CAP }))).toBe(
      KARMA.COMMENT_OVER_CAP_ACTOR,
    )
  })
  it("share over cap → 0", () => {
    expect(computeApplied("share", 2, ctx({ sharesMade: KARMA.DAILY_SHARE_CAP }))).toBe(0)
  })
})

describe("pair-like cap", () => {
  it("beyond PAIR_LIKE_CAP likes to same target → 0", () => {
    expect(computeApplied("like", 1, ctx({ pairLikesGiven: KARMA.PAIR_LIKE_CAP }))).toBe(0)
    expect(computeApplied("like", 1, ctx({ pairLikesGiven: KARMA.PAIR_LIKE_CAP - 1 }))).toBe(1)
  })
})

describe("repeat-comment halving", () => {
  it("halves an in-window repeat comment", () => {
    expect(computeApplied("comment", 1.5, ctx({ repeatComment: true }))).toBe(0.75)
  })
  it("stacks with the over-cap reduction", () => {
    expect(
      computeApplied("comment", 1.5, ctx({ repeatComment: true, commentsMade: 999 })),
    ).toBe(KARMA.COMMENT_OVER_CAP_ACTOR * KARMA.REPEAT_COMMENT_FACTOR)
  })
})

describe("mutual downvote", () => {
  it("actor earns no negative when retaliated against", () => {
    expect(computeApplied("downvote_post", -0.5, ctx({ mutualDownvote: true }))).toBe(0)
    expect(computeApplied("downvote_comment", -1, ctx({ mutualDownvote: true }))).toBe(0)
  })
  it("normal downvote still costs the actor", () => {
    expect(computeApplied("downvote_post", -0.5, ctx())).toBe(-0.5)
  })
})

describe("payment / membership karma config", () => {
  it("tier values are perks-worthy and ordered", () => {
    const m = KARMA.MEMBERSHIP_KARMA
    expect(m.associate).toBeLessThan(m.premium)
    expect(m.premium).toBeLessThan(m.life)
    expect(KARMA.MEMBERSHIP_RENEWAL).toBeLessThan(m.associate)
  })
  it("payment karma computes at full value (no social caps apply)", () => {
    // actionType "membership_payment" classifies as "other", role self, no counterparty.
    expect(classifyKind("membership_payment")).toBe("other")
    expect(computeApplied("other", KARMA.MEMBERSHIP_KARMA.life, ctx({ role: "self" }))).toBe(
      KARMA.MEMBERSHIP_KARMA.life,
    )
  })
})

describe("negative daily floor", () => {
  it("zeroes further negatives once at/below the floor", () => {
    expect(computeApplied("downvote_post", -0.5, ctx({ netKarma: KARMA.NEGATIVE_DAILY_FLOOR }))).toBe(0)
    expect(computeApplied("downvote_post", -2, ctx({ netKarma: -20 }))).toBe(0)
  })
  it("clamps a negative that would cross the floor", () => {
    // net -9.5, a -2 would reach -11.5 → clamp to land exactly at -10 (room -0.5)
    expect(computeApplied("downvote_post", -2, ctx({ netKarma: -9.5 }))).toBe(-0.5)
  })
  it("floors publisher negatives too", () => {
    expect(computeApplied("downvote_post", -2, ctx({ role: "publisher", netKarma: -9 }))).toBe(-1)
  })
})
