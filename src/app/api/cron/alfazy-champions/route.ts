import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { LIVE_GAMES } from "@/config/games";
import { closeJustEnded } from "@/modules/games/champions";
import { cacheTag } from "@/modules/games/leaderboard";

// Daily cron: freezes any Alfazy period (daily/weekly/monthly/yearly) that just
// closed as of the run time into game_champions. Idempotent — re-running replaces
// the same anchor's rows. Daily cadence is Hobby-safe (see vercel.json).
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const closed = await closeJustEnded();
  for (const game of LIVE_GAMES) revalidateTag(cacheTag(game.key), "max");
  return NextResponse.json({ ok: true, closed });
}
