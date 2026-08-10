import Link from "next/link"
import { Lock, UserPlus, LogIn } from "lucide-react"
import type { BlockReason } from "@/modules/profile/privacy"

export interface RestrictedProfileProps {
  reason: BlockReason
  name: string
  username: string
  photoUrl: string
  /** Public-safe identity — shown for alumni-guest / connections, hidden for private. */
  headline?: string | null
  batchLabel?: string | null
  house?: { name: string; color: string } | null
  isVerified?: boolean
}

// Shown instead of the full profile when the viewer isn't allowed to see it
// (Profile.visibility gate). Only public-safe identity fields are passed in —
// the sensitive payload is never fetched or sent for a blocked viewer.
export function RestrictedProfile({
  reason, name, username, photoUrl, headline, batchLabel, house, isVerified,
}: RestrictedProfileProps) {
  const showIdentity = reason !== "private"

  const copy: Record<BlockReason, { title: string; body: string }> = {
    "alumni-guest": {
      title: "Sign in to view this profile",
      body: `${name}'s full profile is visible to signed-in JNV Nagpur alumni.`,
    },
    connections: {
      title: "This profile is limited to connections",
      body: `Only people ${name.split(" ")[0]} is connected with can see this profile.`,
    },
    private: {
      title: "This profile is private",
      body: "The full profile isn't publicly visible.",
    },
  }
  const { title, body } = copy[reason]

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        {showIdentity ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={name}
            className="mx-auto h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
            <Lock className="h-8 w-8 text-gray-400" />
          </div>
        )}

        {showIdentity && (
          <>
            <h1 className="mt-4 flex items-center justify-center gap-1.5 text-lg font-bold text-gray-900">
              {name}
              {isVerified && <span className="text-brand" title="Verified">✔</span>}
            </h1>
            {headline && <p className="mt-0.5 text-sm text-gray-500">{headline}</p>}
            <div className="mt-1 flex items-center justify-center gap-2 text-xs text-gray-500">
              {batchLabel && <span>{batchLabel}</span>}
              {house && (
                <span
                  className="rounded-full px-2 py-0.5 font-medium text-white"
                  style={{ backgroundColor: house.color }}
                >
                  {house.name}
                </span>
              )}
            </div>
          </>
        )}

        <div className="mt-5 flex items-center justify-center gap-1.5 text-sm font-semibold text-gray-800">
          <Lock className="h-4 w-4 text-gray-400" />
          {title}
        </div>
        <p className="mt-1 text-sm text-gray-500">{body}</p>

        {reason === "alumni-guest" ? (
          <Link
            href={`/auth/signin?callbackUrl=/${encodeURIComponent(username)}`}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <LogIn className="h-4 w-4" /> Sign in
          </Link>
        ) : reason === "connections" ? (
          <Link
            href="/feed"
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <UserPlus className="h-4 w-4" /> Back to feed
          </Link>
        ) : null}
      </div>
    </div>
  )
}
