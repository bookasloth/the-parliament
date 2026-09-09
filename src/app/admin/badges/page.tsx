import { requireAdmin } from "@/modules/auth/session";
import { prisma } from "@/lib/prisma";
import { RARITY_TONE, RARITY_LABEL } from "@/components/shared/badges/rarity";
import type { BadgeRarity } from "@/config/badges";

export const dynamic = "force-dynamic";

// Admin overview of the badge catalogue. The catalogue itself is code-managed
// (src/config/badges.ts, seeded by scripts/seed-badges.ts) — this page reads it
// back from the DB with per-badge grant counts. Manual badges (committee, bug
// hunter, …) are awarded per-user from the Users admin (setBadge).
export default async function AdminBadgesPage() {
  await requireAdmin();

  const [badges, grants, holders] = await Promise.all([
    prisma.badge.findMany({
      orderBy: [{ category: "asc" }, { seriesOrder: "asc" }, { displayPriority: "asc" }, { label: "asc" }],
      select: { id: true, key: true, label: true, category: true, rarity: true, awardMode: true, iconUrl: true, isHidden: true },
    }),
    prisma.userBadge.groupBy({ by: ["badgeId"], _count: { badgeId: true } }),
    prisma.user.count({ where: { badgeCount: { gt: 0 } } }),
  ]);

  const countBy = new Map(grants.map((g) => [g.badgeId, g._count.badgeId]));
  const totalGrants = grants.reduce((s, g) => s + g._count.badgeId, 0);
  const autoCount = badges.filter((b) => b.awardMode === "auto").length;
  const manualCount = badges.length - autoCount;

  return (
    <div className="px-6 py-6">
      <div className="mb-1 text-xl font-bold text-gray-900">Badges</div>
      <p className="mb-6 text-sm text-gray-500">
        Achievement catalogue (code-managed). Manual badges are granted per-user from Users.
      </p>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total badges" value={badges.length} />
        <Stat label="Auto / Manual" value={`${autoCount} / ${manualCount}`} />
        <Stat label="Total grants" value={totalGrants} />
        <Stat label="Members with badges" value={holders} />
      </div>

      {/* Catalogue table */}
      <div className="overflow-hidden rounded-[5px] border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wider text-gray-500">
                <th className="px-4 py-2.5 font-semibold">Badge</th>
                <th className="px-4 py-2.5 font-semibold">Category</th>
                <th className="px-4 py-2.5 font-semibold">Rarity</th>
                <th className="px-4 py-2.5 font-semibold">Mode</th>
                <th className="px-4 py-2.5 text-right font-semibold">Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {badges.map((b) => {
                const tone = RARITY_TONE[b.rarity as BadgeRarity];
                return (
                  <tr key={b.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-[6px] ring-1 ${tone.bg} ${tone.ring}`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={b.iconUrl || "/achievements/badge.svg"} alt="" className="h-full w-full object-contain p-0.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {b.label}
                            {b.isHidden && <span className="ml-1.5 text-[10px] font-medium text-gray-400">hidden</span>}
                          </div>
                          <div className="font-mono text-[11px] text-gray-400">{b.key}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 capitalize text-gray-600">{(b.category ?? "—").replace(/_/g, " ")}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${tone.bg} ${tone.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                        {RARITY_LABEL[b.rarity as BadgeRarity]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${b.awardMode === "auto" ? "bg-sky-50 text-sky-700" : "bg-gray-100 text-gray-600"}`}>
                        {b.awardMode}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums text-gray-900">
                      {(countBy.get(b.id) ?? 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[5px] border border-gray-200 bg-white p-4">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </p>
    </div>
  );
}
