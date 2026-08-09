"use client"

import { Printer } from "lucide-react"

/** Print / save-as-PDF. Print CSS on the page hides everything but the certificate. */
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print inline-flex items-center gap-2 rounded-[4px] bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
    >
      <Printer className="h-4 w-4" /> Download / print
    </button>
  )
}
