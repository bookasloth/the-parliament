import Link from "next/link";
import Image from "next/image";
import { ChevronUp, ChevronDown, Minus, Sparkles, Trophy, Crown } from "lucide-react";
import { requireUser } from "@/modules/auth/session";
import { leaderboardWithMovement, SCOPES, type Scope, type Movement, type LeaderEntry } from "@/modules/games/leaderboard";
import { PERIODS, type Period } from "@/modules/games/periods";
import { formatAnchor, PERIOD_LABEL, SCOPE_LABEL } from "@/modules/games/format";
import Podium from "@/components/games/Podium";
import LeaderboardTabs from "@/components/games/LeaderboardTabs";

export const metadata = { title: "Alfazy Leaderboard · The Parliament" };
export const dynamic = "force-dynamic";

function asScope(v?: string): Scope {
  return SCOPES.includes(v as Scope) ? (v as Scope) : "individual";
}
function asPeriod(v?: string): Period {
  return PERIODS.includes(v as Period) ? (v as Period) : "daily";
}

function MovementBadge({ m }: { m: Movement | undefined }) {
  if (m === "up") return <ChevronUp className="h-4 w-4 text-emerald-500" />;
  if (m === "down") return <ChevronDown className="h-4 w-4 text-rose-500" />;
  if (m === "new") return <Sparkles className="h-3.5 w-3.5 text-brand" />;
  return <Minus className="h-4 w-4 text-gray-300" />;
}

export default async function AlfazyLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; period?: string; anchor?: string }>;
}) {
  const sp = await searchParams;
  const scope = asScope(sp.scope);
  const period = asPeriod(sp.period);
  const user = await requireUser();

  const { anchor, entries, movement } = await leaderboardWithMovement(scope, period, sp.anchor);

  // League rail: current #1 per scope for the selected period.
  const rail = await Promise.all(
    SCOPES.map(async (s) => {
      const r = await leaderboardWithMovement(s, period, sp.anchor);
      const top = r.entries[0] ?? null;
      return { scope: s, top, movement: top ? r.movement.get(top.key) : undefined };
    }),
  );

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);
  const myEntry = scope === "individual" ? entries.find((e) => e.key === user.id) : undefined;

  const tabLink = (next: Partial<{ scope: Scope; period: Period }>) => {
    const q = new URLSearchParams({ scope: next.scope ?? scope, period: next.period ?? period });
    return `/games/alfazy/leaderboard?${q.toString()}`;
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900">Leaderboard</h1>
          <p className="text-[13.5px] text-gray-500">
            {SCOPE_LABEL[scope]} · {formatAnchor(period, anchor)}
          </p>
        </div>
        <Link href="/games/alfazy/champions" className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3.5 py-2 text-[13px] font-semibold text-amber-700 hover:bg-amber-100">
          <Crown className="h-4 w-4" /> Hall of Champions
        </Link>
      </header>

      {/* Tabs (client, snappy) */}
      <LeaderboardTabs scope={scope} period={period} />

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Main column */}
        <div className="space-y-5">
          {/* Podium */}
          {podium.length > 0 ? (
            <section className="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 className="mb-5 font-heading text-lg font-bold text-gray-900">Podium Finishers</h2>
              <Podium
                entries={podium.map((e) => ({ key: e.key, label: e.label, color: e.color, total: e.total, avatarUrl: e.avatarUrl }))}
                scope={scope}
                currentUserId={user.id}
              />
              {myEntry && (
                <div className="mt-5 flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
                  <span className="text-[13.5px] font-semibold text-gray-700">Your rank</span>
                  <span className="text-[15px] font-extrabold text-brand">#{myEntry.rank} · {myEntry.total} pts</span>
                </div>
              )}
            </section>
          ) : (
            <section className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50">
                <Trophy className="h-7 w-7 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-700">No plays in this window yet</p>
              <p className="mt-1 text-[13.5px] text-gray-400">Be the first to get on the board.</p>
              <Link href="/games/alfazy/play" className="mt-4 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105">
                Play now
              </Link>
            </section>
          )}

          {/* Table */}
          {entries.length > 0 && (
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <table className="w-full text-left text-[13.5px]">
                <thead className="bg-gray-50 text-[12px] uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Rank</th>
                    <th className="px-4 py-3 font-semibold">{SCOPE_LABEL[scope]}</th>
                    <th className="px-4 py-3 text-center font-semibold">Move</th>
                    <th className="px-4 py-3 text-right font-semibold">Points</th>
                    {scope === "individual" && <th className="px-4 py-3 text-right font-semibold">Best</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(rest.length ? entries : podium).map((e: LeaderEntry) => (
                    <tr
                      key={e.key}
                      className={`transition-colors hover:bg-gray-50 ${e.key === user.id ? "bg-brand-50/60" : ""}`}
                    >
                      <td className="px-4 py-3 font-bold text-gray-700">{e.rank}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          {scope === "individual" &&
                            (e.avatarUrl ? (
                              <Image src={e.avatarUrl} alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
                            ) : (
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand">
                                {e.label.charAt(0)}
                              </span>
                            ))}
                          {scope === "house" && (
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: e.color ?? "#ccc" }} />
                          )}
                          <span className={`font-semibold ${e.key === user.id ? "text-brand" : "text-gray-900"}`}>
                            {e.key === user.id ? "You" : e.label}
                          </span>
                          {scope !== "individual" && <span className="text-[12px] text-gray-400">· {e.players} players</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex justify-center">
                          <MovementBadge m={movement.get(e.key)} />
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">{e.total}</td>
                      {scope === "individual" && (
                        <td className="px-4 py-3 text-right text-gray-500">{e.bestGuesses ? `${e.bestGuesses}/6` : "—"}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>

        {/* League rail */}
        <aside className="space-y-3">
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-gray-900">
            <Trophy className="h-5 w-5 text-amber-500" /> Leaders · {PERIOD_LABEL[period]}
          </h2>
          {rail.map(({ scope: s, top, movement: m }) => (
            <Link
              key={s}
              href={tabLink({ scope: s })}
              className={`block rounded-2xl border p-4 transition-colors hover:border-brand ${
                s === scope ? "border-brand bg-brand-50/40" : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-gray-900">{SCOPE_LABEL[s]} League</span>
                <MovementBadge m={m} />
              </div>
              {top ? (
                <p className="mt-1 text-[13.5px] text-gray-600">
                  <span className="font-semibold text-gray-900">{top.label}</span> leads · {top.total} pts
                </p>
              ) : (
                <p className="mt-1 text-[13px] text-gray-400">No plays yet</p>
              )}
            </Link>
          ))}
        </aside>
      </div>
    </div>
  );
}
