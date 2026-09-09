import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Trophy } from "lucide-react";
import { getUserAchievements } from "@/modules/badges/profile";
import BadgeCard from "@/components/shared/badges/BadgeCard";
import { RARITY_TONE, RARITY_LABEL, RARITY_ORDER } from "@/components/shared/badges/rarity";

export default async function AchievementsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const user = await prisma.user.findFirst({
    where: { username },
    select: { id: true, displayName: true, legalName: true },
  });
  if (!user) notFound();

  const firstName = (user.displayName || user.legalName || "").split(" ")[0] || "This alumnus";
  const a = await getUserAchievements(user.id);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{firstName}&apos;s Achievements</h1>
          <p className="text-sm text-gray-500">Badges earned across the platform</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Achievement score" value={a.score.toLocaleString("en-IN")} />
        <Stat label="Badges" value={`${a.earnedCount} / ${a.totalCount}`} />
        <Stat label="Completion" value={`${a.completionPct}%`} />
        <Stat
          label="Latest unlock"
          value={a.latest ? a.latest.label : "—"}
          small
        />
      </div>

      {/* Rarity legend */}
      <div className="mb-8 flex flex-wrap gap-2">
        {RARITY_ORDER.map((r) => (
          <span
            key={r}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${RARITY_TONE[r].bg} ${RARITY_TONE[r].text}`}
          >
            <span className={`h-2 w-2 rounded-full ${RARITY_TONE[r].dot}`} />
            {RARITY_LABEL[r]}
          </span>
        ))}
      </div>

      {/* Categories */}
      <div className="space-y-8">
        {a.categories.map((cat) => (
          <section key={cat.key}>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-700">
              <span className="inline-block h-[15px] w-[5px] rounded-[3px] bg-brand" />
              {cat.label}
              <span className="text-xs font-normal text-gray-400">
                {cat.badges.filter((b) => b.earned).length}/{cat.badges.length}
              </span>
            </h2>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {cat.badges.map((b) => (
                <BadgeCard key={b.key} badge={b} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-1 font-bold text-gray-900 ${small ? "truncate text-lg" : "text-3xl tabular-nums"}`}>
        {value}
      </p>
    </div>
  );
}
