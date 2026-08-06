// Shared skeleton primitives for the games routes' loading.tsx files.

export function Bar({ w = "100%", h = 16, className = "" }: { w?: string | number; h?: number; className?: string }) {
  return <div className={`rounded bg-gray-100 ${className}`} style={{ width: w, height: h }} />;
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <Bar w={140} h={20} />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Bar key={i} w={`${90 - i * 12}%`} />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
        <Bar w={180} h={12} />
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Bar w={24} h={24} className="rounded-md" />
            <Bar w={`${40 + (i % 3) * 10}%`} />
            <div className="ml-auto"><Bar w={48} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
