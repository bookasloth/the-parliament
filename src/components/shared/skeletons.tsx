// Generic, mobile-first skeleton archetypes for gated pages. Each mirrors the
// real layout closely enough to avoid layout shift when content streams in.
// Feed-specific skeletons live in ./feed-skeletons.

const PAGE = "mx-auto max-w-[1400px] px-4 py-6 sm:px-6"

/** Page header block (title + subtitle), optional trailing action pill. */
export function PageHeaderSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-6 w-48 rounded bg-gray-200" />
        <div className="h-3 w-64 max-w-full rounded bg-gray-100" />
      </div>
      {action && <div className="h-9 w-28 flex-shrink-0 rounded-full bg-gray-200" />}
    </div>
  )
}

/** Square-photo person/business card (matches AlumniProfileCard footprint). */
export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white animate-pulse">
      <div className="aspect-square w-full bg-gray-200" />
      <div className="space-y-2 p-3">
        <div className="h-3.5 w-3/4 rounded bg-gray-200" />
        <div className="h-3 w-1/2 rounded bg-gray-100" />
        <div className="h-3 w-2/3 rounded bg-gray-100" />
      </div>
    </div>
  )
}

/** Responsive card grid: 1 col mobile → up to 4 on desktop. */
export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

/** Stacked list rows (notifications, connections, chapters). */
export function ListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
          <div className="h-11 w-11 flex-shrink-0 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-40 max-w-[70%] rounded bg-gray-200" />
            <div className="h-3 w-56 max-w-[85%] rounded bg-gray-100" />
          </div>
          <div className="hidden h-8 w-20 flex-shrink-0 rounded-full bg-gray-100 sm:block" />
        </div>
      ))}
    </div>
  )
}

/** Detail page: banner + title over a main/sidebar split (stacks on mobile). */
export function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-40 w-full rounded-xl bg-gray-200 sm:h-56" />
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1 space-y-3">
          <div className="h-6 w-2/3 rounded bg-gray-200" />
          <div className="h-3 w-full rounded bg-gray-100" />
          <div className="h-3 w-11/12 rounded bg-gray-100" />
          <div className="h-3 w-4/5 rounded bg-gray-100" />
          <div className="h-64 w-full rounded-xl bg-gray-100" />
        </div>
        <aside className="w-full flex-shrink-0 lg:w-80">
          <div className="h-48 w-full rounded-xl bg-gray-200" />
        </aside>
      </div>
    </div>
  )
}

/** Centered form (settings, edit, register, checkout). */
export function FormSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-2xl animate-pulse space-y-5 rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="h-6 w-40 rounded bg-gray-200" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-28 rounded bg-gray-100" />
          <div className="h-10 w-full rounded-lg bg-gray-100" />
        </div>
      ))}
      <div className="h-10 w-32 rounded-full bg-gray-200" />
    </div>
  )
}

/** Full-page wrappers so loading.tsx files stay one-liners. */
export function GridPage({ action = false, count }: { action?: boolean; count?: number }) {
  return (
    <div className={PAGE}>
      <PageHeaderSkeleton action={action} />
      <CardGridSkeleton count={count} />
    </div>
  )
}

export function ListPage({ action = false, count }: { action?: boolean; count?: number }) {
  return (
    <div className={PAGE}>
      <PageHeaderSkeleton action={action} />
      <ListSkeleton count={count} />
    </div>
  )
}

export function DetailPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <DetailSkeleton />
    </div>
  )
}

export function FormPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <FormSkeleton />
    </div>
  )
}
