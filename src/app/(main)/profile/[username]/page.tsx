import { notFound } from "next/navigation"
// Auth disabled for UI testing — profile page is public
// import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  // const session = await auth()

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      legalName: true,
      displayName: true,
      email: true,
      username: true,
      status: true,
      memberType: true,
      currentStatus: true,
      createdAt: true,
      profile: {
        select: {
          photoUrl: true,
          bio: true,
          city: true,
          profession: true,
          company: true,
          headline: true,
          house: { select: { name: true, colorHex: true } },
        },
      },
      _count: {
        select: {
          connectionsRequested: true,
          posts: true,
        },
      },
    },
  })

  if (!user) {
    notFound()
  }

  // const isOwnProfile = session?.user?.id === user.id

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-6">
            <div className="h-24 w-24 shrink-0 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500">
              {user.legalName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {user.legalName}
              </h1>
              {user.profile?.headline && (
                <p className="text-sm text-gray-500 mt-0.5">{user.profile.headline}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {user.profile?.city && (
                  <span className="rounded bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {user.profile.city}
                  </span>
                )}
                {user.profile?.profession && (
                  <span className="rounded bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {user.profile.profession}
                  </span>
                )}
                {user.currentStatus && (
                  <span className="rounded bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 capitalize">
                    {user.currentStatus}
                  </span>
                )}
                {user.profile?.house && (
                  <span
                    className="rounded px-2.5 py-1 text-xs font-medium text-white"
                    style={{ backgroundColor: user.profile.house.colorHex }}
                  >
                    {user.profile.house.name}
                  </span>
                )}
              </div>
              {user.profile?.bio && (
                <p className="mt-4 text-sm text-gray-600">{user.profile.bio}</p>
              )}
              <div className="flex gap-4 mt-4 text-sm text-gray-500">
                <span>{user._count.posts} posts</span>
                <span>{user._count.connectionsRequested} connections</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
