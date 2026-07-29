import { prisma } from "@/lib/prisma"
import DirectoryClient, { MOCK_ALUMNI, type DirectoryAlumni } from "./directory-client"

export const dynamic = "force-dynamic"

const MEMBERSHIP_COLORS: Record<string, string> = {
  associate: "text-amber-500",
  student: "text-green-500",
  premium: "text-blue-700",
  life: "text-yellow-600",
  inactive: "text-gray-400",
  committee: "text-pink-500",
}

export default async function DirectoryPage() {
  const rows = await prisma.user.findMany({
    where: { deletedAt: null, status: "active" },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      username: true,
      legalName: true,
      displayName: true,
      membershipStatus: true,
      isVerified: true,
      profile: {
        select: {
          photoUrl: true,
          headline: true,
          profession: true,
          city: true,
          house: { select: { name: true, colorHex: true } },
          batch: { select: { label: true } },
        },
      },
    },
  })

  const mappedReal: DirectoryAlumni[] = rows.map((u) => {
    const name = u.displayName || u.legalName
    const houseColor = u.profile?.house?.colorHex ?? "#94a3b8"
    return {
      id: u.username || u.id,
      name,
      headline: u.profile?.headline ?? u.profile?.profession ?? "",
      batch: u.profile?.batch?.label ?? "",
      house: u.profile?.house?.name ?? "",
      houseColor,
      location: u.profile?.city ?? "",
      avatar: u.profile?.photoUrl ?? "https://ui-avatars.com/api/?name=" + encodeURIComponent(name),
      isVerified: u.isVerified,
      membership: u.membershipStatus,
      membershipColor: MEMBERSHIP_COLORS[u.membershipStatus] ?? "text-gray-400",
      currentStatus: u.profile?.profession ?? "Working Professional",
      mutualCount: 0,
      borderColor: houseColor,
      connections: 0,
    }
  })

  return <DirectoryClient alumni={[...mappedReal, ...MOCK_ALUMNI]} />
}
