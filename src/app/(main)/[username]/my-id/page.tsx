import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isBlockedBetween } from "@/modules/connections/blocks"
import { formatInr, ID_CARD_PRICE_PAISE, ID_CARD_DELIVERY_PAISE } from "@/config/id-card"
import { MyIDCard } from "./my-id-card"
import { OwnerActions } from "./owner-actions"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function MyIDPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const session = await auth()

  const user = await prisma.user.findFirst({
    where: UUID_RE.test(username) ? { OR: [{ username }, { id: username }] } : { username },
    select: {
      id: true,
      legalName: true,
      displayName: true,
      username: true,
      membershipStatus: true,
      memberType: true,
      isVerified: true,
      passOutYear: true,
      createdAt: true,
      profile: {
        select: {
          photoUrl: true,
          city: true,
          profession: true,
          designation: true,
          company: true,
          linkedinUrl: true,
          socialLinks: true,
          house: { select: { name: true } },
          batch: { select: { startYear: true, endYear: true } },
        },
      },
    },
  })

  if (!user) notFound()

  const viewerId = session?.user?.id
  if (viewerId && viewerId !== user.id && (await isBlockedBetween(viewerId, user.id))) {
    notFound()
  }
  const isOwner = viewerId === user.id

  const displayName = user.displayName || user.legalName || "Alumni"
  const role = [user.profile?.designation, user.profile?.company].filter(Boolean).join(" at ") || tierLabel(user.membershipStatus)
  const city = user.profile?.city || "India"
  const batch = user.profile?.batch
  const batchStr = batch ? `${batch.startYear}–${batch.endYear}` : undefined
  const house = user.profile?.house?.name
  const idNum = `NGP-${String(user.createdAt.getFullYear()).slice(-2)}${String(user.createdAt.getMonth() + 1).padStart(2, "0")}${user.id.slice(0, 4).toUpperCase()}`
  const linkedinUrl = user.profile?.linkedinUrl || undefined
  const socials = (user.profile?.socialLinks ?? {}) as Record<string, string>
  const instagramUrl = socials.instagram || undefined
  const githubUrl = socials.github || undefined
  const pillars: [string, string, string] = [
    house || "JNV",
    batchStr || "Alumni",
    tierLabel(user.membershipStatus),
  ]

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#0a0a0f] relative">
      <MyIDCard
        name={displayName}
        role={role}
        brand="NNAWCA"
        brandTagline="JNV Nagpur Alumni"
        pillars={pillars}
        location={city}
        idNumber={idNum}
        validThru={validThruFromMembership(user.membershipStatus)}
        site={`nnawca.org/${user.username}`}
        photoUrl={user.profile?.photoUrl || undefined}
        linkedinUrl={linkedinUrl}
        instagramUrl={instagramUrl}
        githubUrl={githubUrl}
        footerTagline="Connect · Grow · Give"
      />
      {isOwner && (
        <OwnerActions
          username={user.username ?? user.id}
          cardPriceLabel={formatInr(ID_CARD_PRICE_PAISE)}
          deliveryLabel={formatInr(ID_CARD_DELIVERY_PAISE)}
          defaults={{ recipientName: displayName, city }}
        />
      )}
    </div>
  )
}

function tierLabel(status: string): string {
  switch (status) {
    case "life": return "Life Member"
    case "premium": case "active": return "Premium"
    case "student": return "Student"
    case "committee": return "Committee"
    case "associate": return "Associate"
    default: return "Member"
  }
}

function validThruFromMembership(status: string): string {
  if (status === "life") return "LIFETIME"
  const now = new Date()
  return `12/${now.getFullYear() + 1}`
}
