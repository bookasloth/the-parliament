import { notFound } from "next/navigation"
import { optionalUser } from "@/modules/auth/session"
import { getGroupPageData } from "@/modules/groups/service"
import GroupDetailClient from "./group-detail-client"

export const dynamic = "force-dynamic"

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const user = await optionalUser()

  let data
  try {
    data = await getGroupPageData(slug, user?.id ?? null)
  } catch {
    notFound()
  }
  if (!data) notFound()

  return (
    <>
      <GroupDetailClient data={data} loggedIn={!!user} />
      {(data.canSeeAll || data.isJoined) && (
        <div className="bg-[#f3f2ef]">
          <div className="mx-auto max-w-[1100px] px-4 sm:px-6 pb-10">
            <div className="max-w-2xl">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">Discussion</h2>
              {/* Group discussions not built yet — placeholder until the feature ships. */}
              <div className="rounded-[5px] border border-dashed border-gray-300 bg-white p-8 text-center">
                <p className="text-sm font-semibold text-gray-700">Discussions are coming soon</p>
                <p className="mt-1 text-xs text-gray-500">Group conversations will open up here shortly.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
