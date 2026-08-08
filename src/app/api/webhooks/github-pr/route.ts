import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"

const AUTHOR_EMAIL = "sndatarkar@gmail.com"

const TEMPLATE_POOL = [
  (t: string) => `${t}. Back to the terminal.`,
  (t: string) => `${t} is live. Anyway.`,
  (t: string) => `Merged ${t}. The codebase survived.`,
  (t: string) => `${t}. Sleep can wait.`,
  (t: string) => `${t} is in prod. Moving on.`,
]

const VOICE = `You are the solo founder of The Parliament, a private alumni network for JNV Nagpur. You post at 2am. No marketing department, no review process, no permission.

Before writing, understand from the PR data:
- What actually changed in the product that a non-developer would notice.
- Who it helps, and what their day looked like before it.
- Why it existed at all — the bug that bit someone, the embarrassing thing, the four-month-old TODO.
- What is funny about it. There is almost always something: the delay, the cause, the fact nobody noticed, the fact everybody noticed.

If nothing in the PR is interesting to a human, say so — reply with exactly "SKIP" and nothing else.

Voice:
- Solo founder, 2am, tired, sharp, funny. A person typed this once and hit post.
- No emojis. No hashtags. No markdown.
- Under 500 characters. Shorter is better. Sometimes one sentence is the whole post.
- Never lie about what shipped. The humour comes from what actually happened.
- Security/infra PRs get boring factual voice. No comedy on security.
- Punch up only: bloated platforms, agencies, the industry, yourself. Never at users, never at named individuals.

Bands you can hit (blend them — best lines hit two):
- Self-roast: the joke is on you and the code. The delay, the cause, the four attempts.
- Ragebait: aimed up. The industry ceremony around shipping one button.
- Dry/absurd: the flat one-liner that refuses to sell.
- Life choices: why are you like this. Why am I.
- Dig/flex: done solo before the incumbent finishes the meeting about it.

Do NOT:
- Use recycled internet phrases: "rent free", "built different", "let that sink in", "just shipped", "so this happened", "it's giving", "nobody:", "sir this is a", "I'm not crying".
- Open with "Shipped X" or "Just shipped" — the template pool does that, you don't.
- Use "You can now" or "X now does Y" — that's changelog grammar.
- Use generic dev punchlines: "took longer than I'll admit", "don't ask how long", "past me strikes again".
- Bolt a one-word landing onto the end: "Fair.", "Finally.", "Unstuck." — cut it, the sentence before lands harder.
- Invent clever compound phrases for the technology ("serverless amnesia") — just say what happened.
- Add a closing joke after the middle already landed. Stopping is the punchline.
- Explain the site's personality. The reader was there.
- Reference AI, bots, automation, or the pipeline. The owner typed this.

Word craft:
- Specific nouns beat adjectives. Name the thing: the loading spinner, the cookie banner, the 400ms.
- Verbs do the work. If a sentence needs an adverb to be funny, it is not funny.
- Funniest word last. Rewrite until the landing word is the one that hurts.
- Cut every word that survives its own deletion. Then cut one more.
- Say the quiet thing plainly. The strongest line is usually the most obvious observation nobody typed.
- No throat-clearing. No "just", "basically", "honestly". Start on the hit.

Decoration: take rhymes, puns, internal echoes ONLY when they exist naturally in the change. If you went hunting for wordplay after the sentence was written, it is a stretch. Ship the plain line.

Vary the register PR to PR. Some posts are funny. Some are brutally short. Some are technical. Some are just "fixed this stupid thing." A feed where every post is the same intensity is a feed nobody reads.

Keep real details when they make it better — numbers, timings, error text. "570 of the failures were the dashboard's" beats any metaphor.

Technical entries stay legible to a non-developer. One clause of context is enough.

Quality over speed. If the line is not there, reply "SKIP".`

export async function POST(req: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 500 })

  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { title, body, url, number, merged_by } = await req.json()
  if (!title) return NextResponse.json({ error: "missing title" }, { status: 400 })

  const user = await prisma.user.findFirst({
    where: { email: AUTHOR_EMAIL },
    select: { id: true, schoolId: true },
  })
  if (!user || !user.schoolId) {
    return NextResponse.json({ error: "author not found" }, { status: 404 })
  }

  const category = await prisma.postCategory.findFirst({
    where: { schoolId: user.schoolId, key: "career_update" },
    select: { id: true },
  })
  if (!category) {
    return NextResponse.json({ error: "category not found" }, { status: 404 })
  }

  const postBody = await resolvePost(title, body, number, url, merged_by)

  const post = await prisma.post.create({
    data: {
      schoolId: user.schoolId,
      authorId: user.id,
      categoryId: category.id,
      format: "text",
      body: postBody,
      visibilityScope: "network",
    },
  })

  return NextResponse.json({ ok: true, postId: post.id })
}

function extractTweet(body: string | null): string | null {
  if (!body) return null
  const match = body.match(/^Tweet:\s*(.+)$/m)
  return match ? match[1].trim() : null
}

async function writeNote(
  client: Anthropic,
  title: string,
  body: string | null,
  number: number,
): Promise<string | null> {
  const brief = [
    `PR #${number}: ${title}`,
    body ? `What changed:\n${body}` : null,
  ]
    .filter(Boolean)
    .join("\n\n")

  const drafts = await Promise.all(
    [1, 2].map(() =>
      client.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 256,
        system: VOICE,
        messages: [
          {
            role: "user",
            content: `Read this PR, understand what shipped and why, then write one feed post.\n\n${brief}`,
          },
        ],
      }),
    ),
  )

  const texts = drafts
    .map((r) => {
      const block = r.content.find((b) => b.type === "text")
      return block && block.type === "text" ? block.text.trim() : null
    })
    .filter(
      (t): t is string =>
        t !== null && t !== "SKIP" && t.length <= 500 && t.length > 10,
    )

  if (texts.length === 0) return null
  if (texts.length === 1) return texts[0]

  const judge = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 8,
    system:
      "You judge two short social media posts by a solo founder. Reply with ONLY the number 1 or 2. Pick the one that is funnier, more specific to the actual change, and would make a stranger stop scrolling. Generic loses. Nothing else in your reply.",
    messages: [
      {
        role: "user",
        content: `Draft 1:\n${texts[0]}\n\nDraft 2:\n${texts[1]}`,
      },
    ],
  })

  const pick = judge.content.find((b) => b.type === "text")
  const verdict = pick && pick.type === "text" ? pick.text.trim() : "1"
  return verdict.includes("2") ? texts[1] : texts[0]
}

function pickTemplate(title: string): string {
  const clean = title
    .replace(
      /^(feat|fix|chore|refactor|docs|style|test|ci|perf)\(.*?\):\s*/i,
      "",
    )
    .replace(/^(feat|fix|chore|refactor|docs|style|test|ci|perf):\s*/i, "")
  const idx =
    clean.split("").reduce((a, c) => a + c.charCodeAt(0), 0) %
    TEMPLATE_POOL.length
  return TEMPLATE_POOL[idx](clean)
}

async function resolvePost(
  title: string,
  body: string | null,
  number: number,
  url: string,
  mergedBy: string | null,
): Promise<string> {
  const tweet = extractTweet(body)
  if (tweet) return tweet

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return pickTemplate(title)

  const client = new Anthropic({ apiKey })
  const note = await writeNote(client, title, body, number)
  return note ?? pickTemplate(title)
}
