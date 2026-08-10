"use client"

import { useEffect, useState } from "react"
import { Download, Check, Share, PlusSquare } from "lucide-react"
import { detectPlatform, type Platform } from "@/lib/pwa"

// The event Chromium fires when the PWA is installable. Not in lib.dom yet.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [platform, setPlatform] = useState<Platform>("other")

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari flag
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (standalone) setInstalled(true)

    setPlatform(detectPlatform(navigator.userAgent, false))

    const onPrompt = (e: Event) => {
      e.preventDefault()
      const ev = e as BeforeInstallPromptEvent
      setDeferred(ev)
      setPlatform(detectPlatform(navigator.userAgent, true))
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

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
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

  // Chromium (Android or desktop): real one-tap install.
  if (deferred) {
    return (
      <button
        onClick={install}
        className="inline-flex items-center gap-2 rounded-[3px] bg-brand px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 hover:shadow-md"
      >
        <Download className="h-4 w-4" /> Install app
      </button>
    )
  }

  // iOS Safari: no programmatic install — show the manual steps.
  if (platform === "ios") {
    return (
      <div className="mx-auto max-w-sm rounded-[6px] border border-black/10 bg-white p-5 text-left shadow-sm">
        <p className="mb-3 text-sm font-semibold text-[#1a1a1a]">Install on iPhone / iPad</p>
        <ol className="space-y-2.5 text-sm text-[#5b5b5b]">
          <li className="flex items-center gap-2.5">
            <Share className="h-4 w-4 flex-shrink-0 text-brand" />
            Tap <span className="font-semibold text-[#1a1a1a]">Share</span> in Safari&apos;s toolbar
          </li>
          <li className="flex items-center gap-2.5">
            <PlusSquare className="h-4 w-4 flex-shrink-0 text-brand" />
            Choose <span className="font-semibold text-[#1a1a1a]">Add to Home Screen</span>
          </li>
          <li className="flex items-center gap-2.5">
            <Check className="h-4 w-4 flex-shrink-0 text-brand" />
            Tap <span className="font-semibold text-[#1a1a1a]">Add</span> — done
          </li>
        </ol>
      </div>
    )
  }

  // Unsupported / not-yet-eligible browser. Give a real path forward.
  return (
    <div className="flex flex-col items-center gap-3">
      <a
        href="/feed"
        className="inline-flex items-center gap-2 rounded-[3px] bg-brand px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
      >
        <Download className="h-4 w-4" /> Open the web app
      </a>
      <p className="max-w-xs text-center text-xs text-[#8a8a8a]">
        To install to your home screen, open this page in Chrome (Android) or Safari (iPhone).
      </p>
    </div>
  )
}
