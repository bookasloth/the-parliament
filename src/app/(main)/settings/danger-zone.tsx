"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { TriangleAlert, Loader2 } from "lucide-react"
import { deactivateAccountAction } from "./actions"

/** Danger Zone — self-serve account deactivation, behind an explicit confirm so
 *  it's never a one-click accident. Content is preserved; the account can be
 *  reactivated from this same page. */
export function DangerZone() {
  const [confirming, setConfirming] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()

  function deactivate() {
    start(async () => {
      const res = await deactivateAccountAction()
      if (res.ok) router.refresh()
    })
  }

  return (
    <div className="rounded-[5px] border border-red-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-red-700">
        <TriangleAlert className="h-4.5 w-4.5" /> Danger zone
      </h2>
      <p className="mb-4 text-sm text-gray-500">Deactivating hides you from the network and blocks posting, commenting, and messaging. Your profile and content stay, and you can reactivate anytime.</p>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="rounded-[4px] border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
        >
          Deactivate account
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-[4px] border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-red-800">Deactivate your account? You can reactivate it later.</p>
          <div className="flex flex-shrink-0 gap-2">
            <button
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="rounded-[4px] border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={deactivate}
              disabled={pending}
              className="flex items-center gap-1.5 rounded-[4px] bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Yes, deactivate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
