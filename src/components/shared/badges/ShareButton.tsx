"use client";

import { useState } from "react";

/** Copy a same-origin path to the clipboard as a full URL. */
export default function ShareButton({ path, label = "Share" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`${window.location.origin}${path}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked — no-op */
        }
      }}
      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:border-brand hover:text-brand"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
