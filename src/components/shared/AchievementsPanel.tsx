import Link from "next/link"
import type { BadgeRarity } from "@/config/badges"
import TrophyCase from "./TrophyCase"
import BadgeCard from "./badges/BadgeCard"

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

const BADGES_SHOWN = 5

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
  const { ownerFirstName, ownerUsername, userId, badges, totalBadges, eggs, shells, karma } = data
  const shown = badges.slice(0, BADGES_SHOWN)
  const overflow = totalBadges - shown.length
  const achievementsHref = `/${ownerUsername}/achievements`

  return (
    <div className="rounded-[5px] border border-gray-200/80 bg-white soft-shadow overflow-hidden">
      <div className="px-7 pt-5 pb-1">
        <h5 className="font-heading text-[15px] font-bold text-gray-900">
          {ownerFirstName}&apos;s Achievements
        </h5>
      </div>

      <div className="px-7 pb-6 pt-3">
        {/* Badges */}
        <div className="mb-2 flex items-center justify-between">
          <h4 className={`${SUBHEAD} mb-0`}>Badges</h4>
          <Link href={achievementsHref} className="text-xs font-semibold text-brand hover:underline">
            View all
          </Link>
        </div>
        {totalBadges === 0 ? (
          <p className="mb-4 text-xs text-gray-400">No badges yet — stay active to start earning.</p>
        ) : (
          <div className="mb-4 grid grid-cols-5 gap-2">
            {shown.map((b) => (
              <Link key={b.key} href={achievementsHref}>
                <BadgeCard
                  size="sm"
                  badge={{ ...b, description: null, isHidden: false, earned: true }}
                />
              </Link>
            ))}
            {overflow > 0 && (
              <Link
                href={achievementsHref}
                className="flex h-12 w-12 items-center justify-center self-start rounded-[8px] bg-gray-100 text-xs font-bold text-gray-500 ring-1 ring-gray-200 hover:bg-gray-200"
              >
                +{overflow}
              </Link>
            )}
          </div>
        )}

        {/* Collectables */}
        <h4 className={SUBHEAD}>Collectables</h4>
        <div className="grid grid-cols-3 gap-3">
          <Collectable icon={EGG_ICON} value={fmt(eggs)} label="Eggs" />
          <Collectable icon={KARMA_ICON} value={fmt(karma)} label="Karma" />
          <Collectable icon={SHELL_ICON} value={fmt(shells)} label="Shells" />
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
