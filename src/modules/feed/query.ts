import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { getRanker } from "@/modules/feed/ranker"

export interface FeedFilters {
  schoolId: string
  categoryKey?: string
  batchId?: string
  houseId?: string
  format?: "text" | "image" | "link" | "quote" | "poll" | "question"
  authorId?: string
  groupId?: string | null
  rankerName?: string
  page?: number
  pageSize?: number
  viewerId?: string
}

export async function getFeed(filters: FeedFilters) {
  const page = filters.page ?? 1
  const pageSize = Math.min(filters.pageSize ?? 20, 50)

  const where: Prisma.PostWhereInput = {
    schoolId: filters.schoolId,
    deletedAt: null,
    status: "visible",
  }

  if (filters.format) where.format = filters.format
  if (filters.authorId) where.authorId = filters.authorId
  if (filters.groupId !== undefined) where.groupId = filters.groupId

  if (filters.categoryKey) {
    const cat = await prisma.postCategory.findUnique({
      where: { schoolId_key: { schoolId: filters.schoolId, key: filters.categoryKey } },
      select: { id: true },
    })
    if (cat) where.categoryId = cat.id
  }

  if (filters.batchId || filters.houseId) {
    where.author = {
      is: {
        profile: {
          is: {
            ...(filters.batchId ? { batchId: filters.batchId } : {}),
            ...(filters.houseId ? { houseId: filters.houseId } : {}),
          },
        },
      },
    }
  }

  const candidatePoolSize = pageSize * 4

  const candidates = await prisma.post.findMany({
    where,
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: candidatePoolSize,
    select: postSelect(filters.viewerId),
  })

  const ranker = getRanker(filters.rankerName)
  const now = Date.now()
  const ranked = candidates
    .map((p) => {
      const ageHours = (now - new Date(p.createdAt).getTime()) / 3_600_000
      const score = ranker.score({
        upvoteCount: p.upvoteCount,
        downvoteCount: p.downvoteCount,
        commentCount: p.commentCount,
        shareCount: p.shareCount,
        qualityScore: Number(p.qualityScore),
        reportPenalty: Number(p.reportPenalty),
        ageHours,
        isPinned: p.isPinned,
      })
      return { post: p, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice((page - 1) * pageSize, page * pageSize)

  return {
    rows: ranked.map((r) => r.post),
    page,
    pageSize,
    rankerUsed: ranker.name,
  }
}

function postSelect(viewerId?: string) {
  return {
    id: true,
    format: true,
    body: true,
    media: true,
    linkUrl: true,
    isPinned: true,
    isEdited: true,
    editedAt: true,
    upvoteCount: true,
    downvoteCount: true,
    commentCount: true,
    shareCount: true,
    qualityScore: true,
    reportPenalty: true,
    createdAt: true,
    category: { select: { key: true, label: true } },
    author: {
      select: {
        id: true,
        username: true,
        legalName: true,
        displayName: true,
        isVerified: true,
        membershipStatus: true,
        profile: {
          select: {
            photoUrl: true,
            headline: true,
            house: { select: { id: true, name: true, colorHex: true } },
            batch: { select: { id: true, label: true } },
          },
        },
      },
    },
    ...(viewerId
      ? {
          savedBy: { where: { userId: viewerId }, select: { userId: true }, take: 1 },
        }
      : {}),
  } satisfies Prisma.PostSelect
}
