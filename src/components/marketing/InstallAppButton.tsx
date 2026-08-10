"use client"

import { useEffect, useState } from "react"
import { Check, Share, PlusSquare, MoreVertical } from "lucide-react"

// The event Chromium fires when the PWA is installable. Not in lib.dom yet.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

// Inline brand glyphs so we don't pull an icon pack for two logos.
function AndroidGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.6 9.48l1.84-3.18a.4.4 0 0 0-.69-.4l-1.86 3.23a11.5 11.5 0 0 0-9.78 0L5.25 5.9a.4.4 0 1 0-.69.4L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
    </svg>
  )
}
function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M16.36 12.9c-.02-2.06 1.68-3.05 1.76-3.1-.96-1.4-2.45-1.6-2.98-1.62-1.27-.13-2.48.75-3.12.75-.64 0-1.64-.73-2.7-.71-1.39.02-2.67.8-3.38 2.04-1.44 2.5-.37 6.2 1.03 8.23.69 1 1.5 2.11 2.57 2.07 1.03-.04 1.42-.66 2.67-.66 1.24 0 1.6.66 2.69.64 1.11-.02 1.81-1.01 2.49-2.01.78-1.16 1.1-2.28 1.12-2.34-.02-.01-2.15-.83-2.17-3.27zM14.3 6.9c.56-.69.94-1.63.84-2.58-.81.03-1.8.54-2.38 1.22-.52.6-.98 1.57-.86 2.5.9.07 1.83-.46 2.4-1.14z" />
    </svg>
  )
}

const STEP = "flex items-center gap-2.5"
const KEY = "font-semibold text-[#1a1a1a]"

function InstructionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto mt-5 max-w-sm rounded-[6px] border border-black/10 bg-white p-5 text-left shadow-sm">
      <p className="mb-3 text-sm font-semibold text-[#1a1a1a]">{title}</p>
      <ol className="space-y-2.5 text-sm text-[#5b5b5b]">{children}</ol>
    </div>
  )
}

export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [open, setOpen] = useState<"android" | "ios" | null>(null)

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (standalone) setInstalled(true)

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  async function onAndroid() {
    // Native one-tap when the browser offered it; otherwise show the manual path.
    if (deferred) {
      await deferred.prompt()
      await deferred.userChoice
      setDeferred(null)
      return
    }
    setOpen((o) => (o === "android" ? null : "android"))
  }

  if (installed) {
    return (
      <div className="flex flex-col items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-[4px] bg-[#eef6e8] px-5 py-3 text-sm font-semibold text-[#5a8a3a]">
          <Check className="h-4 w-4" /> App installed
        </span>
        <a href="/feed" className="text-sm font-medium text-brand hover:underline">
          Open the app →
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onAndroid}
          className="inline-flex items-center gap-2.5 rounded-[3px] bg-brand px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 hover:shadow-md"
        >
          <AndroidGlyph className="h-5 w-5" /> Android
        </button>
        <button
          onClick={() => setOpen((o) => (o === "ios" ? null : "ios"))}
          className="inline-flex items-center gap-2.5 rounded-[3px] bg-[#1a1a1a] px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black hover:shadow-md"
        >
          <AppleGlyph className="h-5 w-5" /> iPhone
        </button>
      </div>

      {open === "android" && (
        <InstructionCard title="Install on Android">
          <li className={STEP}>
            <MoreVertical className="h-4 w-4 flex-shrink-0 text-brand" />
            Open the <span className={KEY}>⋮ menu</span> in Chrome
          </li>
          <li className={STEP}>
            <PlusSquare className="h-4 w-4 flex-shrink-0 text-brand" />
            Tap <span className={KEY}>Install app</span> (or Add to Home screen)
          </li>
          <li className={STEP}>
            <Check className="h-4 w-4 flex-shrink-0 text-brand" />
            Confirm <span className={KEY}>Install</span> — done
          </li>
        </InstructionCard>
      )}

      {open === "ios" && (
        <InstructionCard title="Install on iPhone / iPad">
          <li className={STEP}>
            <Share className="h-4 w-4 flex-shrink-0 text-brand" />
            Tap <span className={KEY}>Share</span> in Safari&apos;s toolbar
          </li>
          <li className={STEP}>
            <PlusSquare className="h-4 w-4 flex-shrink-0 text-brand" />
            Choose <span className={KEY}>Add to Home Screen</span>
          </li>
          <li className={STEP}>
            <Check className="h-4 w-4 flex-shrink-0 text-brand" />
            Tap <span className={KEY}>Add</span> — done
          </li>
        </InstructionCard>
      )}
    </div>
  )
}
