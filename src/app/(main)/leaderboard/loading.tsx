// Mirrors /leaderboard: header · podium (2-1-3) · ranked list rows.
export default function LeaderboardLoading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl animate-pulse">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gray-200" />
          <div>
            <div className="h-6 w-56 rounded bg-gray-200" />
            <div className="mt-2 h-3 w-64 rounded bg-gray-100" />
          </div>
        </div>

        {/* Podium */}
        <div className="mb-8 grid grid-cols-3 items-end gap-3">
          {[2, 1, 3].map((r) => (
            <div key={r} className="flex flex-col items-center">
              <div className={`rounded-full bg-gray-200 ${r === 1 ? "h-[72px] w-[72px]" : "h-[56px] w-[56px]"}`} />
              <div className="mt-2 h-3 w-20 rounded bg-gray-200" />
              <div className="mt-1 h-2.5 w-12 rounded bg-gray-100" />
              <div className={`mt-2 w-full rounded-t-lg bg-gray-100 ${r === 1 ? "h-24" : r === 2 ? "h-16" : "h-12"}`} />
            </div>
          ))}
        </div>

        {/* List */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <ul className="divide-y divide-gray-50">
            {Array.from({ length: 7 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="h-4 w-4 rounded bg-gray-200" />
                <div className="h-9 w-9 rounded-full bg-gray-200" />
                <div className="min-w-0 flex-1">
                  <div className="h-3 w-40 rounded bg-gray-200" />
                  <div className="mt-1.5 h-2.5 w-24 rounded bg-gray-100" />
                </div>
                <div className="text-right">
                  <div className="ml-auto h-3.5 w-8 rounded bg-gray-200" />
                  <div className="ml-auto mt-1.5 h-2.5 w-14 rounded bg-gray-100" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
