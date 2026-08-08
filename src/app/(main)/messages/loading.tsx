export default function Loading() {
  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-[1400px] animate-pulse">
      {/* Chat list */}
      <aside className="w-full flex-shrink-0 border-r border-gray-200 bg-white md:w-80 lg:w-96">
        <div className="border-b border-gray-100 p-4">
          <div className="h-9 w-full rounded-[4px] bg-gray-200" />
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <div className="h-11 w-11 flex-shrink-0 rounded-[4px] bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-32 rounded-[3px] bg-gray-200" />
                <div className="h-3 w-48 max-w-[80%] rounded-[3px] bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </aside>
      {/* Conversation pane (desktop only — mobile shows the list) */}
      <div className="hidden flex-1 items-center justify-center bg-[#f3f2ef] md:flex">
        <div className="h-12 w-12 rounded-[4px] bg-gray-200" />
      </div>
    </div>
  )
}
