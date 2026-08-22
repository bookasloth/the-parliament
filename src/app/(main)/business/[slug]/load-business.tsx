import { auth } from "@/lib/auth"
import { colorAvatar } from "@/lib/avatar"
import { isFollowingBusiness, normalizeSocialLinks, type getBusinessBySlug } from "@/modules/business/service"
import { relativeTime } from "../../feed/map-row"
import { BusinessView, type BusinessViewData } from "./business-view"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const fmt = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`

// `b` is already fetched (and approval-checked) by the page, so it's passed in —
// this only resolves the viewer and maps to the view shape.
type BusinessRow = NonNullable<Awaited<ReturnType<typeof getBusinessBySlug>>>

export async function loadBusiness(b: BusinessRow) {
  const session = await auth()
  const viewerId = session?.user?.id ?? null
  const isOwner = viewerId === b.ownerId

  // ponytail: viewerReview is derived from the 20 most-recent reviews. If a viewer's
  // own review is older than that window they'd see a blank form — resubmitting just
  // upserts the same row, so no data is lost. Query it standalone if that ever bites.
  const mine = viewerId ? b.reviews.find((r) => r.reviewerId === viewerId) : undefined
  const viewerFollows = viewerId ? await isFollowingBusiness(b.id, viewerId) : null

  const data: BusinessViewData = {
    slug: b.slug,
    name: b.name,
    category: b.category.label,
    description: b.description,
    logoUrl: b.logoUrl,
    bannerUrl: b.bannerUrl,
    city: b.city,
    website: b.website,
    contactEmail: b.contactEmail,
    contactPhone: b.contactPhone,
    offersAlumniDiscount: b.offersAlumniDiscount,
    ratingAvg: Number(b.ratingAvg),
    ratingCount: b.ratingCount,
    listedLabel: fmt(new Date(b.createdAt)),
    tagline: b.tagline,
    industry: b.industry,
    foundedYear: b.foundedYear,
    employeeSize: b.employeeSize,
    headquarters: b.headquarters,
    socialLinks: normalizeSocialLinks(b.website, b.socialLinks),
    followerCount: b.followerCount,
    viewerFollows,
    owner: {
      userId: b.owner.id,
      username: b.owner.username,
      name: b.owner.displayName || b.owner.legalName,
      avatar: b.owner.profile?.photoUrl || colorAvatar(b.owner.id),
    },
    reviews: b.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      dateLabel: fmt(new Date(r.createdAt)),
      ownerReply: r.ownerReply,
      reviewer: {
        name: r.reviewer.displayName || r.reviewer.legalName,
        username: r.reviewer.username,
        avatar: r.reviewer.profile?.photoUrl || colorAvatar(r.reviewer.id),
      },
    })),
    posts: b.posts.map((p) => ({
      id: p.id,
      body: p.body,
      imageUrl: p.imageUrl,
      timeLabel: relativeTime(p.createdAt),
    })),
    isOwner,
    isAuthed: !!viewerId,
    canReview: !!viewerId && !isOwner,
    viewerReview: mine ? { rating: mine.rating, body: mine.body } : null,
  }

  return <BusinessView data={data} />
}
