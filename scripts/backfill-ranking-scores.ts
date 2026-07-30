// One-off: compute Post.rankingScore for every existing post so older posts
// sort correctly under the new indexed ORDER BY rankingScore in getFeed.
// New posts get scored at creation; mutations recompute — this only backfills
// rows created before ranking was wired. Safe/idempotent, non-destructive.
//   npx tsx scripts/backfill-ranking-scores.ts
import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { hotScore } from "../src/modules/feed/ranking"

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
  const posts = await prisma.post.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      upvoteCount: true,
      downvoteCount: true,
      commentCount: true,
      shareCount: true,
      qualityScore: true,
      reportPenalty: true,
      createdAt: true,
    },
  })
  let n = 0
  for (const p of posts) {
    await prisma.post.update({
      where: { id: p.id },
      data: {
        rankingScore: hotScore({
          upvoteCount: p.upvoteCount,
          downvoteCount: p.downvoteCount,
          commentCount: p.commentCount,
          shareCount: p.shareCount,
          qualityScore: Number(p.qualityScore),
          reportPenalty: Number(p.reportPenalty),
          createdAt: p.createdAt,
        }),
      },
    })
    n++
  }
  console.log(`Backfilled rankingScore for ${n} posts`)
  await pool.end()
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
