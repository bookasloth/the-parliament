export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <div className="animate-pulse space-y-4">
        <div className="h-24 rounded-[5px] bg-gray-200" />
        <div className="h-40 rounded-[5px] bg-gray-200" />
        <div className="h-40 rounded-[5px] bg-gray-200" />
      </div>
    </div>
  );
}
