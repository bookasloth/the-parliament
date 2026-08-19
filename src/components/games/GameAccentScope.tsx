"use client";

import { usePathname } from "next/navigation";
import { gameBySlug } from "@/config/games";

/**
 * Scopes the brand colour scale to the current game's accent. Reads the game
 * from the path (/games/<slug>/…) and stamps [data-game-accent] on a
 * display:contents wrapper, so every brand token inside recolours — with no
 * layout box of its own. On the hub / non-game pages it stamps nothing (brand).
 */
export default function GameAccentScope({ children }: { children: React.ReactNode }) {
  const slug = (usePathname() ?? "").split("/")[2] ?? "";
  const cfg = gameBySlug(slug);
  const accent = cfg && cfg.status === "live" ? cfg.key : undefined;
  return (
    <div data-game-accent={accent} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
