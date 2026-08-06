import { TableSkeleton, CardSkeleton } from "@/components/games/Skeletons";

export default function LeaderboardLoading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-8 w-44 rounded bg-gray-100" />
      <div className="flex gap-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-24 rounded-lg bg-gray-100" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <div className="h-56 rounded-2xl bg-gray-100" />
          <TableSkeleton rows={8} />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} lines={1} />
          ))}
        </div>
      </div>
    </div>
  );
}
