import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"

const AUTHOR_EMAIL = "sndatarkar@gmail.com"

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

  const postBody = await generatePost(title, body, number, url, merged_by)

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

async function generatePost(
  title: string,
  body: string | null,
  number: number,
  url: string,
  mergedBy: string | null,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return fallbackPost(title, mergedBy)
  }

  const client = new Anthropic({ apiKey })

  const prContext = [
    `PR #${number}: ${title}`,
    body ? `Description: ${body}` : null,
    mergedBy ? `Shipped by: ${mergedBy}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 512,
    system: `You write short, engaging social media posts for "The Parliament" — a private alumni network for JNV Nagpur (Jawahar Navodaya Vidyalaya). The audience is fellow alumni who care about the platform growing.

Rules:
- Write 2-4 short paragraphs, casual but proud tone
- Start with a relevant emoji and a punchy headline
- Describe the feature/fix in plain language alumni would understand — no jargon
- End with 2-3 relevant hashtags like #TheParliament #BuildInPublic #NNAWCA
- Do NOT use markdown. Plain text only.
- Keep it under 280 words.
- Sound like a real developer sharing a win, not a press release.`,
    messages: [
      {
        role: "user",
        content: `Write a feed post about this merged PR:\n\n${prContext}`,
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === "text")
  if (!textBlock || textBlock.type !== "text") {
    return fallbackPost(title, mergedBy)
  }

  return textBlock.text
}

function fallbackPost(title: string, mergedBy: string | null): string {
  const clean = title
    .replace(/^(feat|fix|chore|refactor|docs|style|test|ci|perf)\(.*?\):\s*/i, "")
    .replace(/^(feat|fix|chore|refactor|docs|style|test|ci|perf):\s*/i, "")

  let post = `🚀 ${clean}\n\n#TheParliament #BuildInPublic`
  if (mergedBy) post += `\n\nShipped by ${mergedBy}`
  return post
}
