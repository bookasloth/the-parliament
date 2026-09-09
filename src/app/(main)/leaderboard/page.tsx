import Link from "next/link";
import { Trophy } from "lucide-react";
import { optionalUser } from "@/modules/auth/session";
import { getLeaderboard, type LeaderRow } from "@/modules/badges/leaderboard";

export const metadata = { title: "Achievement Leaderboard" };

export default async function LeaderboardPage() {
  const session = await optionalUser();
  const { rows, viewer } = await getLeaderboard(session?.id, 50);

  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  // Podium display order: 2nd, 1st, 3rd (center tallest).
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean) as LeaderRow[];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Achievement Leaderboard</h1>
            <p className="text-sm text-gray-500">Ranked by achievement score across all badges</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-400">
            No one has earned badges yet. Be the first.
          </div>
        ) : (
          <>
            {/* Podium */}
            {podiumOrder.length > 0 && (
              <div className="mb-8 grid grid-cols-3 items-end gap-3">
                {podiumOrder.map((r) => (
                  <PodiumBlock key={r.userId} row={r} />
                ))}
              </div>
            )}

            {/* Ranked list */}
            {rest.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <ul className="divide-y divide-gray-50">
                  {rest.map((r) => (
                    <Row key={r.userId} row={r} me={r.userId === session?.id} />
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {/* Viewer's own rank, when off-screen */}
        {viewer && !rows.some((r) => r.userId === session?.id) && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-brand/30 bg-brand-50 px-5 py-3">
            <span className="text-sm font-semibold text-brand-900">Your rank</span>
            <span className="text-sm font-bold text-brand-900">
              #{viewer.rank} · {viewer.score.toLocaleString("en-IN")} pts
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Avatar({ row, size }: { row: LeaderRow; size: number }) {
  const cls = `flex-shrink-0 rounded-full object-cover ring-2 ring-white`;
  if (row.photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={row.photoUrl} alt="" width={size} height={size} className={cls} style={{ width: size, height: size }} />;
  }
  const initial = row.name.charAt(0).toUpperCase();
  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold text-white ring-2 ring-white`}
      style={{ width: size, height: size, background: row.houseColor || "#009ae4", fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

const MEDAL = ["🥇", "🥈", "🥉"];
const PODIUM_H = { 1: "h-24", 2: "h-16", 3: "h-12" } as const;

function PodiumBlock({ row }: { row: LeaderRow }) {
  const href = `/${row.username ?? row.userId}/achievements`;
  return (
    <div className="flex flex-col items-center">
      <Link href={href} className="flex flex-col items-center">
        <Avatar row={row} size={row.rank === 1 ? 72 : 56} />
        <p className="mt-2 max-w-[8rem] truncate text-center text-sm font-semibold text-gray-900">{row.name}</p>
      </Link>
      <p className="text-xs font-bold tabular-nums text-gray-600">{row.score.toLocaleString("en-IN")} pts</p>
      <div
        className={`mt-2 flex w-full items-start justify-center rounded-t-lg bg-gradient-to-b from-amber-100 to-amber-50 pt-2 ${PODIUM_H[row.rank as 1 | 2 | 3]}`}
      >
        <span className="text-2xl">{MEDAL[row.rank - 1]}</span>
      </div>
    </div>
  );
}

function Row({ row, me }: { row: LeaderRow; me: boolean }) {
  const href = `/${row.username ?? row.userId}/achievements`;
  return (
    <li className={`flex items-center gap-3 px-4 py-3 ${me ? "bg-brand-50" : ""}`}>
      <span className="w-7 flex-shrink-0 text-center text-sm font-bold tabular-nums text-gray-400">{row.rank}</span>
      <Avatar row={row} size={36} />
      <div className="min-w-0 flex-1">
        <Link href={href} className="block truncate text-sm font-semibold text-gray-900 hover:underline">
          {row.name}
        </Link>
        <p className="truncate text-xs text-gray-400">
          {[row.batchLabel, row.houseName].filter(Boolean).join(" · ") || "—"}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-sm font-bold tabular-nums text-gray-900">{row.score.toLocaleString("en-IN")}</p>
        <p className="text-xs text-gray-400">{row.badgeCount} badges</p>
      </div>
    </li>
  );
}
