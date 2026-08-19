"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Share2, Check, Download, Copy, MessageCircle, Users } from "lucide-react";
import { reportShareAction } from "@/app/(main)/games/actions";
import { renderResultImage, type ResultImageData } from "@/lib/games/resultImage";

/**
 * Share a game result. Text is built server-side (real puzzle number + absolute
 * URL). When `gameKey` + `image` are given, the "Share" button expands a card
 * with every target — Copy, Community, WhatsApp, LinkedIn, Facebook, Instagram,
 * Download image — and renders a PNG result card (with the guess grid) for the
 * image/native-share/Instagram paths. Every share reports to analytics.
 * Without gameKey/image it stays a plain text/clipboard share (legacy callers).
 */
export default function ShareResult({
  text,
  className = "",
  gameKey,
  image,
  url,
}: {
  text: string;
  className?: string;
  gameKey?: string;
  image?: ResultImageData;
  /** Absolute URL of the game (for Facebook/LinkedIn). Falls back to the current origin. */
  url?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const blobRef = useRef<Blob | null>(null);

  const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");

  const report = useCallback(
    (target: string) => {
      if (gameKey) reportShareAction(gameKey, target).catch(() => {});
    },
    [gameKey],
  );

  const getImage = useCallback(async (): Promise<Blob | null> => {
    if (!image) return null;
    if (!blobRef.current) blobRef.current = await renderResultImage(image);
    return blobRef.current;
  }, [image]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      report("copy");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }, [text, report]);

  const downloadImage = useCallback(async () => {
    const blob = await getImage();
    if (!blob) return;
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = "result.png";
    a.click();
    URL.revokeObjectURL(href);
  }, [getImage]);

  // Native share sheet with the PNG (mobile); falls back to download on desktop.
  const shareImage = useCallback(
    async (target: string) => {
      const blob = await getImage();
      if (!blob) return void copy();
      const file = new File([blob], "result.png", { type: "image/png" });
      if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text });
          report(target);
          return;
        } catch {
          /* dismissed — fall through to download */
        }
      }
      await downloadImage();
      report("download");
    },
    [getImage, copy, downloadImage, text, report],
  );

  // Legacy text-only mode.
  if (!gameKey || !image) {
    return (
      <button
        onClick={copy}
        className={`flex items-center justify-center gap-2 rounded-[4px] px-4 py-2.5 text-sm font-semibold transition-colors ${className}`}
      >
        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
        {copied ? "Copied!" : "Share result"}
      </button>
    );
  }

  return (
    <div className="w-full">
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          // On mobile, the first tap goes straight to the native sheet with the image.
          if (next && typeof navigator !== "undefined" && typeof navigator.canShare === "function") void shareImage("native_image");
        }}
        className={`flex w-full items-center justify-center gap-2 rounded-[4px] px-4 py-2.5 text-sm font-semibold transition-colors ${className}`}
      >
        <Share2 className="h-4 w-4" /> Share
      </button>

      {open && (
        <div className="mt-2 space-y-2 rounded-[5px] border border-gray-200 bg-white p-3">
          <div className="flex gap-2">
            <button onClick={copy} className="flex flex-1 items-center justify-center gap-1.5 rounded-[4px] bg-gray-100 px-3 py-2 text-[13px] font-semibold text-gray-700 hover:bg-gray-200">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
            </button>
            <Link
              href={`/compose?text=${encodeURIComponent(text)}`}
              onClick={() => report("community")}
              className="flex flex-[2] items-center justify-center gap-1.5 rounded-[4px] bg-brand-50 px-3 py-2 text-[13px] font-semibold text-brand hover:bg-brand-100"
            >
              <Users className="h-4 w-4" /> Share to Community
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" onClick={() => report("whatsapp")} className="flex items-center justify-center gap-1 rounded-[4px] bg-gray-100 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-200">
              <MessageCircle className="h-4 w-4" /> WA
            </a>
            <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" onClick={() => report("linkedin")} className="flex items-center justify-center rounded-[4px] bg-gray-100 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-200">
              LinkedIn
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" onClick={() => report("facebook")} className="flex items-center justify-center rounded-[4px] bg-gray-100 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-200">
              Facebook
            </a>
            <button onClick={() => shareImage("instagram")} className="flex items-center justify-center rounded-[4px] bg-gray-100 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-200">
              Instagram
            </button>
          </div>

          <button onClick={downloadImage} className="flex w-full items-center justify-center gap-1.5 rounded-[4px] border border-gray-200 py-2 text-[13px] font-semibold text-gray-700 hover:bg-gray-50">
            <Download className="h-4 w-4" /> Download image
          </button>
        </div>
      )}
    </div>
  );
}
