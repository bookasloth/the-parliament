import { TableSkeleton } from "@/components/games/Skeletons";

export default function ChampionsLoading() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-8 w-56 rounded-[3px] bg-gray-200" />
      <div className="flex gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-[3px] bg-gray-200" />
        ))}
      </div>
      <TableSkeleton rows={10} />
    </div>
  );
}
