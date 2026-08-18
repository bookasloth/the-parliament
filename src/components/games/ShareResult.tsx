"use client";

import { useCallback, useRef, useState } from "react";
import { Share2, Check, Download, Copy, MessageCircle } from "lucide-react";
import { reportShareAction } from "@/app/(main)/games/actions";
import { renderResultImage, type ResultImageData } from "@/lib/games/resultImage";

/**
 * Share a game result. Text is built server-side (real puzzle number + absolute
 * URL). When `gameKey` + `image` are given, also offers a rendered PNG card
 * (native share-sheet with the file on mobile, download on desktop) and reports
 * each share to analytics. Without them it stays a plain text/clipboard share.
 */
export default function ShareResult({
  text,
  className = "",
  gameKey,
  image,
}: {
  text: string;
  className?: string;
  gameKey?: string;
  image?: ResultImageData;
}) {
  const [copied, setCopied] = useState(false);
  const blobRef = useRef<Blob | null>(null);

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

  const shareText = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text });
        report("native_text");
        return;
      } catch {
        /* dismissed — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      report("copy");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  }, [text, report]);

  const shareImage = useCallback(async () => {
    const blob = await getImage();
    if (!blob) return void shareText();
    const file = new File([blob], "result.png", { type: "image/png" });
    if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text });
        report("native_image");
        return;
      } catch {
        /* dismissed — fall through to download */
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "result.png";
    a.click();
    URL.revokeObjectURL(url);
    report("download");
  }, [getImage, shareText, text, report]);

  // Text-only mode (legacy usages: alfazy hub/results).
  if (!gameKey || !image) {
    return (
      <button
        onClick={shareText}
        className={`flex items-center justify-center gap-2 rounded-[4px] px-4 py-2.5 text-sm font-semibold transition-colors ${className}`}
      >
        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
        {copied ? "Copied!" : "Share result"}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={shareImage}
        className={`flex items-center justify-center gap-2 rounded-[4px] px-4 py-2.5 text-sm font-semibold transition-colors ${className}`}
      >
        <Share2 className="h-4 w-4" /> Share
      </button>
      <div className="flex gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => report("whatsapp")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[4px] bg-white/15 px-3 py-2 text-[13px] font-semibold text-current transition-colors hover:bg-white/25"
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(text).then(
              () => {
                setCopied(true);
                report("copy");
                setTimeout(() => setCopied(false), 2000);
              },
              () => {},
            );
          }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[4px] bg-white/15 px-3 py-2 text-[13px] font-semibold text-current transition-colors hover:bg-white/25"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
        </button>
        <button
          onClick={async () => {
            const blob = await getImage();
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "result.png";
            a.click();
            URL.revokeObjectURL(url);
            report("download");
          }}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[4px] bg-white/15 px-3 py-2 text-[13px] font-semibold text-current transition-colors hover:bg-white/25"
        >
          <Download className="h-4 w-4" /> Image
        </button>
      </div>
    </div>
  );
}
