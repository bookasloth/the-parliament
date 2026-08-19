import { NextRequest, NextResponse } from "next/server";
import { gameByCode } from "@/config/games";

// Short share links: /g/<code> → the game. Codes live in the registry
// (alfz / htbl / intg). Public (not gated) — the game page itself gates.
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const cfg = gameByCode(code);
  return NextResponse.redirect(new URL(cfg ? `/games/${cfg.slug}` : "/games", req.url));
}
