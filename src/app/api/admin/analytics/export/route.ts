import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/gate"
import { toCsv } from "./csv"

export const dynamic = "force-dynamic"

function displayNameOf(u: { displayName: string | null; legalName: string | null; username: string | null }) {
  return u.displayName || u.legalName || u.username || ""
}

async function buildCsv(dataset: string): Promise<string | null> {
  switch (dataset) {
    case "signups": {
      const now = new Date()
      const since = new Date(now.getFullYear(), now.getMonth() - 11, 1)
      const users = await prisma.user.findMany({
        where: { deletedAt: null, createdAt: { gte: since } },
        select: { createdAt: true },
      })
      const labels: string[] = []
      const keys: string[] = []
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        labels.push(d.toLocaleString("en-US", { month: "short", year: "numeric" }))
        keys.push(`${d.getFullYear()}-${d.getMonth()}`)
      }
      const buckets = keys.map(() => 0)
      for (const u of users) {
        const idx = keys.indexOf(`${u.createdAt.getFullYear()}-${u.createdAt.getMonth()}`)
        if (idx >= 0) buckets[idx]++
      }
      return toCsv(["month", "count"], labels.map((m, i) => [m, buckets[i]]))
    }
    case "tiers": {
      const groups = await prisma.user.groupBy({ by: ["membershipStatus"], where: { deletedAt: null }, _count: true })
      return toCsv(["tier", "count"], groups.map((g) => [g.membershipStatus, g._count as number]))
    }
    case "top-members": {
      const members = await prisma.user.findMany({
        where: { deletedAt: null },
        orderBy: { userKarma: { karmaBalance: "desc" } },
        take: 10,
        select: {
          displayName: true,
          legalName: true,
          username: true,
          userKarma: { select: { karmaBalance: true } },
          _count: { select: { posts: true } },
        },
      })
      return toCsv(
        ["name", "karma", "posts"],
        members.map((m) => [displayNameOf(m), Number(m.userKarma?.karmaBalance ?? 0), m._count.posts]),
      )
    }
    case "top-groups": {
      const groups = await prisma.group.findMany({
        orderBy: { members: { _count: "desc" } },
        take: 10,
        select: { name: true, _count: { select: { members: true } } },
      })
      return toCsv(["group", "members"], groups.map((g) => [g.name, g._count.members]))
    }
    case "top-posts": {
      const posts = await prisma.post.findMany({
        where: { deletedAt: null, status: "visible" },
        orderBy: { upvoteCount: "desc" },
        take: 10,
        select: {
          body: true,
          upvoteCount: true,
          commentCount: true,
          author: { select: { displayName: true, legalName: true, username: true } },
        },
      })
      return toCsv(
        ["author", "upvotes", "comments", "excerpt"],
        posts.map((p) => [displayNameOf(p.author), p.upvoteCount, p.commentCount, (p.body ?? "").slice(0, 60)]),
      )
    }
    default:
      return null
  }
}

export async function GET(req: Request) {
  await requirePermission("analytics:read")

  const dataset = new URL(req.url).searchParams.get("dataset") ?? ""
  const csv = await buildCsv(dataset)
  if (csv === null) {
    return new Response("Unknown dataset", { status: 400 })
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${dataset}.csv"`,
    },
  })
}
