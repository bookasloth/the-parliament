// One-off: index #hashtags for every existing post into hashtags/post_hashtags.
// syncPostHashtags only runs on post create/edit, so posts written before that
// feature landed carry #tags in their body but have zero post_hashtags rows —
// making /feed?tag=... come back empty. This rebuilds the index from bodies.
// Idempotent: wipes and rebuilds post_hashtags, then sets useCount from the
// actual reference counts (re-running does not inflate).
//   npx tsx scripts/backfill-hashtags.ts
import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { extractHashtags } from "../src/modules/feed/hashtags"

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  const posts = await prisma.post.findMany({
    where: { deletedAt: null },
    select: { id: true, body: true },
  })

  // Clean slate so the rebuild is idempotent.
  await prisma.postHashtag.deleteMany({})

  const useCount = new Map<string, number>() // tag -> number of posts using it
  let links = 0
  for (const p of posts) {
    const tags = extractHashtags(p.body)
    for (const tag of tags) {
      const ht = await prisma.hashtag.upsert({
        where: { tag },
        create: { tag, useCount: 0 },
        update: {},
        select: { id: true },
      })
      await prisma.postHashtag.create({ data: { postId: p.id, hashtagId: ht.id } })
      useCount.set(tag, (useCount.get(tag) ?? 0) + 1)
      links++
    }
  }

  // Set useCount to the true reference count (not incremented).
  for (const [tag, count] of useCount) {
    await prisma.hashtag.update({ where: { tag }, data: { useCount: count } })
  }

  console.log(`Indexed ${links} post→hashtag links across ${useCount.size} tags from ${posts.length} posts`)
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
