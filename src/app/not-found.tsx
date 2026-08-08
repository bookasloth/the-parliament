import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold tracking-widest text-brand-600 uppercase">404</p>
      <h1 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">Page not found</h1>
      <p className="mt-3 max-w-md text-gray-600">
        The page you are looking for does not exist or was moved.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/feed"
          className="rounded-[4px] bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Go to feed
        </Link>
        <Link
          href="/"
          className="rounded-[4px] border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
