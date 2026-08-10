// Client-safe tokenizer for rendering message/comment bodies: splits text into
// plain runs, @mentions (profile links) and bare URLs. Kept pure + DB-free so it
// can be unit-tested and imported into client components (unlike modules/feed/
// mentions.ts, which pulls in prisma). The lookbehind stops email local-parts
// (me@site.com) from registering as a mention.
export type BodyToken =
  | { type: "text"; value: string }
  | { type: "mention"; handle: string; value: string }
  | { type: "url"; value: string }

const SPLIT_RE = /((?<![a-z0-9._-])@[a-z0-9][a-z0-9._-]{1,59}|https?:\/\/\S+)/gi

export function tokenizeBody(text: string): BodyToken[] {
  const out: BodyToken[] = []
  for (const part of text.split(SPLIT_RE)) {
    if (!part) continue
    if (/^@[a-z0-9]/i.test(part)) out.push({ type: "mention", handle: part.slice(1), value: part })
    else if (/^https?:\/\//i.test(part)) out.push({ type: "url", value: part })
    else out.push({ type: "text", value: part })
  }
  return out
}
