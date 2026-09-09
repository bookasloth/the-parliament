import Link from "next/link"
import type { BadgeRarity } from "@/config/badges"

const BADGE_FALLBACK = "/achievements/badge.svg"

/**
 * Profile "Achievements" card — earned Badges + Collectables (Rotten Eggs /
 * Karma) + the existing Alfazy TrophyCase, grouped as one card in the profile
 * right rail. Featured badges link to the full /[username]/achievements page.
 *
 * Icons for Eggs / Karma fall back to placeholder SVGs in /public/achievements/*.
 * Swap those files (same paths) for real artwork — no code change needed. Badge
 * icons come from the DB (`badge.iconUrl`); trophies come from TrophyCase.
 */

const EGG_ICON = "/achievements/rotten-egg.svg"
const KARMA_ICON = "/achievements/karma.svg"
const SHELL_ICON = "/achievements/shell.svg"

const BADGES_SHOWN = 9

export type AchievementBadge = { key: string; label: string; iconUrl: string | null; rarity: BadgeRarity }

export type AchievementsData = {
  ownerFirstName: string
  ownerUsername: string
  userId: string
  badges: AchievementBadge[]
  totalBadges: number
  eggs: number
  shells: number
  karma: number
}

const fmt = (n: number) => n.toLocaleString("en-US")
const SUBHEAD = "mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500"

export function AchievementsPanel({ data }: { data: AchievementsData }) {
  const { ownerFirstName, ownerUsername, badges, totalBadges, eggs, shells, karma } = data
  // Order is set upstream in loadProfile (Committee first, then each category
  // top→lower). Just take the first 6.
  const shown = badges.slice(0, BADGES_SHOWN)
  const overflow = totalBadges - shown.length
  const badgesHref = `/${ownerUsername}/badges`

  return (
    <div className="rounded-[5px] border border-gray-200/80 bg-white soft-shadow overflow-hidden">
      <div className="px-7 pt-5 pb-1">
        <h5 className="font-heading text-[15px] font-bold text-gray-900">
          {ownerFirstName}&apos;s Achievements
        </h5>
      </div>

      <div className="px-7 pb-6 pt-3">
        {/* Badges — one compact row: up to 3 icons + a "+N" box */}
        <h4 className={SUBHEAD}>Badges</h4>
        {totalBadges === 0 ? (
          <p className="mb-2 text-xs text-gray-400">No badges yet — stay active to start earning.</p>
        ) : (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {shown.map((b) => (
              <Link
                key={b.key}
                href={badgesHref}
                className="flex h-[46px] w-[46px] items-center justify-center rounded-[8px] border border-[#ddd] bg-[#f7f7f7] p-1.5 hover:border-brand"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.iconUrl || BADGE_FALLBACK} alt={b.label} className="max-h-[28px] max-w-[28px] object-contain" />
              </Link>
            ))}
            {overflow > 0 && (
              <Link
                href={badgesHref}
                className="flex h-[46px] w-[46px] items-center justify-center rounded-[8px] border border-[#ddd] bg-[#f7f7f7] text-xs font-bold text-brand hover:border-brand"
              >
                +{overflow}
              </Link>
            )}
          </div>
        )}
        <Link href={badgesHref} className="mb-5 inline-block text-xs font-semibold text-brand hover:underline">
          View Your Badges
        </Link>

        {/* Collectables — stacked so the full numbers are always visible */}
        <h4 className={SUBHEAD}>Collectables</h4>
        <div className="grid grid-cols-1 gap-2">
          <Collectable icon={EGG_ICON} value={fmt(eggs)} label="Eggs" />
          <Collectable icon={KARMA_ICON} value={fmt(karma)} label="Karma" />
          <Collectable icon={SHELL_ICON} value={fmt(shells)} label="Shells" />
        </div>
      </div>
    </div>
  )
}

function Collectable({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-[5px] border border-gray-200 bg-white px-3 py-2">
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icon} alt="" className="h-5 w-5 flex-shrink-0 object-contain" />
        <p className="text-xs font-semibold text-gray-500">{label}</p>
      </div>
      <p className="text-sm font-bold tabular-nums text-gray-900">{value}</p>
    </div>
  )
}
