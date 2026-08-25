"use client"

import { useState } from "react"
import { UserPlus, Copy, Check, Share2 } from "lucide-react"

// ponytail: no referral tracking exists yet — this shares the plain signup link.
// Add ?ref=<username> + attribution when the karma REFERRAL_SIGNUP flow is wired.
export default function ReferPage() {
  const [copied, setCopied] = useState(false)
  const link = typeof window !== "undefined" ? `${window.location.origin}/auth/signup` : "/auth/signup"
  const message = `Join me on NNAWCA — the JNV Nagpur alumni network. Sign up here: ${link}`

  function copy() {
    if (!navigator?.clipboard) return
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  function share() {
    if (navigator.share) {
      navigator.share({ title: "Join NNAWCA", text: message, url: link }).catch(() => {})
    } else {
      copy()
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
          <UserPlus className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Refer an Alumni</h1>
          <p className="text-sm text-gray-500">Help fellow Navodayans find their way back to the network.</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <label className="mb-1.5 block text-xs font-semibold text-gray-700">Your invite link</label>
        <div className="flex gap-2">
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-[3px] border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none"
          />
          <button
            onClick={copy}
            className="flex items-center gap-1.5 rounded-[3px] border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-[3px] bg-[#25D366] px-4 py-2.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Share on WhatsApp
          </a>
          <button
            onClick={share}
            className="flex items-center justify-center gap-1.5 rounded-[3px] border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Share2 className="h-4 w-4" /> More
          </button>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">
        Every alumnus you bring in makes the network stronger.
      </p>
    </div>
  )
}
