"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Share2, Check, Download, Copy, Users } from "lucide-react";
import { reportShareAction } from "@/app/(main)/games/actions";
import { renderResultImage, type ResultImageData } from "@/lib/games/resultImage";

// Brand glyphs (lucide has none) — monochrome, inherit currentColor.
function BrandIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
      <path d={path} />
    </svg>
  );
}
const WHATSAPP =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.892c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a12.062 12.062 0 005.71 1.447h.006c6.585 0 11.946-5.335 11.949-11.896 0-3.176-1.24-6.165-3.487-8.411";
const LINKEDIN =
  "M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z";
const FACEBOOK =
  "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z";
const INSTAGRAM =
  "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z";

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
            <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" onClick={() => report("whatsapp")} aria-label="Share on WhatsApp" className="flex items-center justify-center rounded-[4px] bg-gray-100 py-2.5 text-gray-800 hover:bg-gray-200">
              <BrandIcon path={WHATSAPP} />
            </a>
            <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" onClick={() => report("linkedin")} aria-label="Share on LinkedIn" className="flex items-center justify-center rounded-[4px] bg-gray-100 py-2.5 text-gray-800 hover:bg-gray-200">
              <BrandIcon path={LINKEDIN} />
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" onClick={() => report("facebook")} aria-label="Share on Facebook" className="flex items-center justify-center rounded-[4px] bg-gray-100 py-2.5 text-gray-800 hover:bg-gray-200">
              <BrandIcon path={FACEBOOK} />
            </a>
            <button onClick={() => shareImage("instagram")} aria-label="Share to Instagram" className="flex items-center justify-center rounded-[4px] bg-gray-100 py-2.5 text-gray-800 hover:bg-gray-200">
              <BrandIcon path={INSTAGRAM} />
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
