"use client";

import { useEffect } from "react";

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
      <p className="mt-2 max-w-md text-gray-600">
        We hit an unexpected error loading this page. Try again in a moment.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-gray-400">Ref: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Try again
      </button>
    </main>
  );
}
