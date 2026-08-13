import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/modules/auth/session"
import { Star } from "lucide-react"

const ACTION_LABELS: Record<string, string> = {
  profile_complete: "Completed your profile",
  profile_field: "Updated a profile field",
  daily_login: "Logged in today",
  post_like_actor: "You liked a post",
  post_like_publisher: "Someone liked your post",
  comment_actor: "You commented on a post",
  comment_publisher: "Someone commented on your post",
  share_actor: "You shared a post",
  share_publisher: "Someone shared your post",
  downvote_post_actor: "You downvoted a post",
  downvote_comment_actor: "You downvoted a comment",
  downvote_publisher: "Your post was downvoted",
  downvote_comment_publisher: "Your comment was downvoted",
  connection_accepted: "Connection accepted",
  event_attended: "Attended an event",
  event_hosted: "Hosted an event",
  business_added: "Added a business listing",
  donation: "Made a donation",
  admin_adjustment: "Admin adjustment",
  redemption_spend: "Redeemed karma for a reward",
  post_award_received: "Received an award on your post",
}

function labelFor(actionType: string): string {
  return ACTION_LABELS[actionType] ?? actionType.replace(/_/g, " ")
}

export default async function KarmaPage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const session = await requireUser()

  const user = await prisma.user.findFirst({
    where: { username },
    select: { id: true, legalName: true, displayName: true },
  })
  if (!user) notFound()

  const isOwner = session.id === user.id
  if (!isOwner) notFound()

  const [karma, transactions] = await Promise.all([
    prisma.userKarma.findUnique({
      where: { userId: user.id },
      select: { karmaBalance: true, lifetimeEarned: true },
    }),
    prisma.karmaTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        actionType: true,
        appliedValue: true,
        createdAt: true,
      },
    }),
  ])

  const balance = Math.round(Number(karma?.karmaBalance ?? 0))
  const lifetime = Math.round(Number(karma?.lifetimeEarned ?? 0))

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Star className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Karma</h1>
            <p className="text-sm text-gray-500">Your reputation on the platform</p>
          </div>
        </div>

        {/* Balance cards */}
        <div className="mb-8 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Balance</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900">{balance.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Lifetime Earned</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-gray-900">{lifetime.toLocaleString()}</p>
          </div>
        </div>

        {/* Transaction history */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-800">Recent Activity</h2>
          </div>

          {transactions.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-gray-400">
              No karma activity yet
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {transactions.map((tx) => {
                const val = Number(tx.appliedValue)
                const positive = val > 0
                return (
                  <li key={tx.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`flex-shrink-0 text-sm font-bold tabular-nums ${positive ? "text-green-600" : "text-red-500"}`}
                      >
                        {positive ? "+" : ""}{val}
                      </span>
                      <span className="text-sm text-gray-700 truncate">
                        {labelFor(tx.actionType)}
                      </span>
                    </div>
                    <time className="flex-shrink-0 text-xs text-gray-400 ml-3">
                      {tx.createdAt.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </time>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
