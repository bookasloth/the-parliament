import { describe, it, expect } from "vitest"
import { matchTopic, conversationTopic } from "@/lib/supabase-realtime"

describe("realtime topics", () => {
  it("matchTopic namespaces by match id", () => {
    expect(matchTopic("abc")).toBe("vyapaar-match:abc")
    expect(matchTopic("abc")).not.toBe(conversationTopic("abc"))
  })
})
