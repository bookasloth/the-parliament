"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

/**
 * Share today's Alfazy result. Uses the native share sheet where available
 * (mobile), otherwise copies the score text to the clipboard. `text` is built
 * server-side so it always carries the real puzzle number + absolute URL.
 */
export default function ShareResult({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // user dismissed or share failed — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — nothing more we can do silently
    }
  }

  return (
    <button
      onClick={share}
      className={`flex items-center justify-center gap-2 rounded-[4px] px-4 py-2.5 text-sm font-semibold transition-colors ${className}`}
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {copied ? "Copied!" : "Share result"}
    </button>
  );
}
