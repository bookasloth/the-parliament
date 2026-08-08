// Skeleton that mirrors the real profile layout (cover + overlapping avatar +
// name/tabs on the left, About sidebar on the right) so the load-in doesn't jump.
export default function Loading() {
  const Card = ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-hidden rounded-[5px] border border-gray-200 bg-white">{children}</div>
  )
  return (
    <div className="min-h-screen animate-pulse bg-[#eef0f4] px-4 py-6">
      <div className="mx-auto max-w-[1300px]">
        <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[1.6fr_1fr]">
          {/* Left: header card */}
          <Card>
            <div className="h-[200px] bg-gray-200" />
            <div className="px-7 pb-2">
              {/* avatar overlapping cover */}
              <div className="-mt-[62px] h-[118px] w-[118px] rounded-[4px] border-4 border-white bg-gray-300" />
              <div className="mt-3 h-6 w-52 rounded-[3px] bg-gray-200" />
              <div className="mt-2 h-4 w-72 max-w-full rounded-[3px] bg-gray-200" />
              {/* meta row */}
              <div className="mt-4 flex gap-4 border-t border-gray-100 pt-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-4 w-20 rounded-[3px] bg-gray-200" />
                ))}
              </div>
              {/* tabs */}
              <div className="mt-3 flex gap-6 border-t border-gray-100 pt-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-4 w-16 rounded-[3px] bg-gray-200" />
                ))}
              </div>
            </div>
          </Card>

          {/* Right: About sidebar */}
          <Card>
            <div className="space-y-3 p-7">
              <div className="h-5 w-32 rounded-[3px] bg-gray-200" />
              <div className="h-3 w-full rounded-[3px] bg-gray-200" />
              <div className="h-3 w-5/6 rounded-[3px] bg-gray-200" />
              <div className="space-y-2.5 pt-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-[3px] bg-gray-200" />
                    <div className="h-4 w-40 rounded-[3px] bg-gray-200" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2.5 pt-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 w-10 rounded-[4px] bg-gray-200" />
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Post placeholders under the header */}
        <div className="mt-[18px] grid grid-cols-1 gap-[18px] lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-[18px]">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-[5px] border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-[4px] bg-gray-200" />
                  <div className="space-y-2">
                    <div className="h-3.5 w-40 rounded-[3px] bg-gray-200" />
                    <div className="h-3 w-24 rounded-[3px] bg-gray-200" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-full rounded-[3px] bg-gray-200" />
                  <div className="h-3 w-11/12 rounded-[3px] bg-gray-200" />
                  <div className="h-3 w-2/3 rounded-[3px] bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
          <div />
        </div>
      </div>
    </div>
  )
}
