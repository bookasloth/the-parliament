import { requireUser } from "@/modules/auth/session"
import { getEndorsementByToken } from "@/modules/verification/endorsements"
import EndorseForm from "./endorse-form"

export const dynamic = "force-dynamic"

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#f3f2ef] px-4 py-10">
      <div className="w-full max-w-md rounded-[5px] border border-gray-200 bg-white p-6 shadow-sm">{children}</div>
    </div>
  )
}

export default async function EndorsePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  // Not a public route → proxy already forced sign-in and bounced back here.
  const user = await requireUser()

  const data = await getEndorsementByToken(token)
  if (!data) {
    return (
      <Shell>
        <h1 className="text-lg font-bold text-gray-900">Request not found</h1>
        <p className="mt-2 text-sm text-gray-600">This endorsement link is invalid or has been removed.</p>
      </Shell>
    )
  }

  const { endorsement, candidate } = data

  if (endorsement.endorserId !== user.id) {
    return (
      <Shell>
        <h1 className="text-lg font-bold text-gray-900">This request isn&apos;t for you</h1>
        <p className="mt-2 text-sm text-gray-600">
          This endorsement was addressed to a different member. If you were forwarded this link, please ignore it.
        </p>
      </Shell>
    )
  }

  const candidateName = candidate?.user.displayName || candidate?.user.legalName || "A fellow alumnus"
  const expired = endorsement.expiresAt.getTime() < Date.now()
  const alreadyResponded = endorsement.status !== "pending"

  if (expired || endorsement.status === "expired") {
    return (
      <Shell>
        <h1 className="text-lg font-bold text-gray-900">Link expired</h1>
        <p className="mt-2 text-sm text-gray-600">This endorsement request has expired. Ask the admin to send a new one if you&apos;d still like to help.</p>
      </Shell>
    )
  }

  if (alreadyResponded) {
    return (
      <Shell>
        <h1 className="text-lg font-bold text-gray-900">Already responded</h1>
        <p className="mt-2 text-sm text-gray-600">
          You&apos;ve already {endorsement.status === "endorsed" ? "endorsed" : "declined"} this request. Thank you.
        </p>
      </Shell>
    )
  }

  return (
    <Shell>
      <p className="text-[11px] font-bold uppercase tracking-wider text-brand">Peer endorsement</p>
      <h1 className="mt-1 text-lg font-bold text-gray-900">Do you know {candidateName}?</h1>
      <p className="mt-2 text-sm text-gray-600">
        They&apos;re verifying their JNV Nagpur alumni status. You were suggested as someone who studied around the same time.
      </p>

      <div className="mt-4 flex items-center gap-3 rounded-[4px] border border-gray-200 bg-gray-50 p-3">
        {candidate?.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={candidate.photoUrl} alt="" className="h-11 w-11 rounded-[4px] object-cover" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-[3px] bg-brand text-sm font-bold text-white">
            {candidateName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{candidateName}</p>
          <p className="truncate text-xs text-gray-500">
            {[candidate?.batch?.label, candidate?.house?.name].filter(Boolean).join(" · ") || "Batch/house not set"}
          </p>
        </div>
      </div>

      <EndorseForm token={token} candidateName={candidateName} />
    </Shell>
  )
}
