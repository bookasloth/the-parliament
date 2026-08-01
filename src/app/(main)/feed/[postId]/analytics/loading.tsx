// Route-level skeleton — mirrors the analytics layout (4×2 stat grid + top
// commenter cards) so navigation shows structure instead of a blank page.
export default function AnalyticsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 space-y-5">
      <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gray-200 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-5 w-12 rounded bg-gray-200 animate-pulse" />
              <div className="h-2.5 w-16 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="h-3 w-32 rounded bg-gray-200 animate-pulse" />
        <div className="h-3 rounded-full bg-gray-200 animate-pulse" />
      </div>

      <div className="space-y-3">
        <div className="h-3 w-28 rounded bg-gray-200 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-gray-200 animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-3 w-20 rounded bg-gray-200 animate-pulse" />
                <div className="h-2.5 w-14 rounded bg-gray-100 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
