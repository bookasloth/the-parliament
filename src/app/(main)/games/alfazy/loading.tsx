import { CardSkeleton } from "@/components/games/Skeletons";

export default function AlfazyHubLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-gray-100" />
        <div className="space-y-2">
          <div className="h-6 w-32 rounded bg-gray-100" />
          <div className="h-3 w-48 rounded bg-gray-100" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="h-52 rounded-2xl bg-gray-100" />
        <CardSkeleton lines={5} />
        <CardSkeleton lines={3} />
      </div>
    </div>
  );
}
