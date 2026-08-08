import TrophyCase from "./TrophyCase"

/**
 * Profile "Achievements" card — Badges + Collectables (Rotten Eggs / Karma) +
 * the existing Alfazy TrophyCase, grouped as one card in the profile right rail.
 *
 * Icons for Eggs / Karma fall back to placeholder SVGs in /public/achievements/*.
 * Swap those files (same paths) for real artwork — no code change needed. Badge
 * icons come from the DB (`badge.iconUrl`); trophies come from TrophyCase.
 *
 * Rendered inside the client profile tree — TrophyCase self-fetches its data.
 */

const EGG_ICON = "/achievements/rotten-egg.svg"
const KARMA_ICON = "/achievements/karma.svg"
const SHELL_ICON = "/achievements/shell.svg"
const BADGE_FALLBACK = "/achievements/badge.svg"

const BADGES_SHOWN = 6

export type AchievementBadge = { key: string; label: string; iconUrl: string | null }

export type AchievementsData = {
  ownerFirstName: string
  userId: string
  badges: AchievementBadge[]
  totalBadges: number
  /** No backing model yet — pass 0 until an "eggs" currency exists. */
  eggs: number
  karma: number
}

const fmt = (n: number) => n.toLocaleString("en-US")
const SUBHEAD = "mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500"

export function AchievementsPanel({ data }: { data: AchievementsData }) {
  const { ownerFirstName, userId, badges, totalBadges, eggs, karma } = data
  const shown = badges.slice(0, BADGES_SHOWN)
  const overflow = totalBadges - shown.length

  return (
    <div className="rounded-[5px] border border-gray-200/80 bg-white soft-shadow overflow-hidden">
      <div className="px-7 pt-5 pb-1">
        <h5 className="font-heading text-[15px] font-bold text-gray-900">
          {ownerFirstName}&apos;s Achievements
        </h5>
      </div>

      <div className="px-7 pb-6 pt-3">
        {/* Collectables */}
        <h4 className={SUBHEAD}>Collectables</h4>
        <div className="grid grid-cols-3 gap-3">
          <Collectable icon={EGG_ICON} value={fmt(eggs)} label="Eggs" />
          <Collectable icon={KARMA_ICON} value={fmt(karma)} label="Karma" />
          <Collectable icon={SHELL_ICON} value={fmt(0)} label="Shells" />
        </div>

        {/* Trophies — existing Alfazy champion titles. Renders nothing if none. */}
        <TrophyCase userId={userId} />
      </div>
    </div>
  )
}

function Collectable({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="rounded-[5px] border border-gray-200 bg-white px-3 py-2.5">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icon} alt="" className="h-6 w-6 flex-shrink-0 object-contain" />
        <p className="text-lg font-bold leading-tight text-gray-900 tabular-nums">{value}</p>
      </div>
    </div>
  )
}
