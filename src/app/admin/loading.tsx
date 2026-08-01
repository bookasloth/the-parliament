export default function Loading() {
  return (
    <div className="animate-pulse space-y-5 p-4 sm:p-6">
      <div className="h-7 w-56 max-w-full rounded bg-slate-200" />
      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="h-11 border-b border-slate-100 bg-slate-50" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-slate-50 p-4">
            <div className="h-9 w-9 flex-shrink-0 rounded-full bg-slate-200" />
            <div className="h-3.5 flex-1 rounded bg-slate-100" />
            <div className="hidden h-3.5 w-24 rounded bg-slate-100 sm:block" />
            <div className="h-8 w-20 flex-shrink-0 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
