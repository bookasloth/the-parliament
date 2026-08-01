// Skeleton mirrors edit-client.tsx's layout 1:1 so there's no reflow on load:
// mobile strength banner + [240px nav | content card | 320px right rail].

const box = "rounded-[4px] bg-gray-200"
const line = "rounded bg-gray-200"

function Bar({ w, h = "h-3" }: { w: string; h?: string }) {
  return <div className={`${line} ${h} ${w}`} />
}

export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] animate-pulse bg-[#f3f2ef] pb-6">
      <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-6">
        {/* mobile strength banner */}
        <div className="mb-4 flex items-center gap-3 rounded-[4px] border border-gray-200 bg-white p-3 xl:hidden">
          <div className="h-[72px] w-[72px] flex-shrink-0 rounded-full border-[7px] border-gray-200" />
          <div className="flex-1 space-y-2"><Bar w="w-24" h="h-3.5" /><Bar w="w-40" /></div>
        </div>

        <div className="flex flex-col gap-5 lg:flex-row">
          {/* left nav */}
          <div className="hidden w-[240px] flex-shrink-0 lg:block">
            <div className="space-y-1 rounded-[4px] border border-gray-200 bg-white p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <div className={`${box} h-[18px] w-[18px]`} /><Bar w="w-28" />
                </div>
              ))}
            </div>
          </div>

          {/* content card */}
          <div className="min-w-0 flex-1 space-y-4">
            <div className="rounded-[4px] border border-gray-200 bg-white">
              <div className="space-y-1.5 px-4 pt-4 sm:px-5"><Bar w="w-40" h="h-4" /><Bar w="w-64" /></div>
              <div className="px-4 py-4 sm:px-5">
                {/* hero: cover + avatar */}
                <div className="overflow-hidden rounded-[4px] border border-gray-200">
                  <div className="h-[120px] w-full bg-gray-200 sm:h-[160px]" />
                  <div className="flex items-end gap-3 bg-white px-4 pb-3 sm:px-5">
                    <div className="-mt-10 h-24 w-24 rounded-full border-4 border-white bg-gray-200 sm:h-28 sm:w-28" />
                    <div className="space-y-2 pb-2"><Bar w="w-44" /><Bar w="w-52" /></div>
                  </div>
                </div>
                {/* field grid */}
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-1.5"><Bar w="w-20" /><div className={`${box} h-9 w-full`} /></div>
                  ))}
                </div>
                {/* headline + overview */}
                <div className="mt-4 space-y-1.5"><Bar w="w-24" /><div className={`${box} h-9 w-full`} /></div>
                <div className="mt-4 space-y-1.5"><Bar w="w-24" /><div className={`${box} h-16 w-full`} /></div>
                {/* save */}
                <div className="mt-4 flex justify-end"><div className={`${box} h-9 w-28`} /></div>
              </div>
            </div>
          </div>

          {/* right rail */}
          <div className="hidden w-[320px] flex-shrink-0 space-y-4 xl:block">
            <div className="rounded-[4px] border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="h-[72px] w-[72px] flex-shrink-0 rounded-full border-[7px] border-gray-200" />
                <div className="space-y-2"><Bar w="w-28" h="h-3.5" /><div className={`${box} h-4 w-20`} /></div>
              </div>
              <div className="mt-3 space-y-1.5">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className={`${box} h-9 w-full`} />)}
              </div>
            </div>
            <div className="rounded-[4px] border border-gray-200 bg-white p-4">
              <div className="mb-3 space-y-1.5"><Bar w="w-24" h="h-3.5" /><Bar w="w-28" /></div>
              {/* preview card shape */}
              <div className="overflow-hidden rounded-[4px] border border-gray-200">
                <div className="h-[70px] w-full bg-gray-200" />
                <div className="flex flex-col items-center px-4 pb-4">
                  <div className="-mt-[38px] h-[76px] w-[76px] rounded-full border-4 border-white bg-gray-200" />
                  <div className="mt-2 space-y-2"><Bar w="w-32" h="h-3.5" /></div>
                  <div className="mt-3 h-12 w-full border-y border-gray-100" />
                  <div className="mt-3 flex w-full gap-2"><div className={`${box} h-8 flex-1`} /><div className={`${box} h-8 flex-1`} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
