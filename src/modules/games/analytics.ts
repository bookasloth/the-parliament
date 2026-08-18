/**
 * Game analytics — every game emits events into the existing ActivityEvent sink
 * (the same table that powers DAU/MAU on the admin dashboard). No new service.
 *
 * All emits are fire-and-forget: an analytics write must NEVER fail or block a
 * play, so every call swallows its own errors.
 */

import { prisma } from "@/lib/prisma";
import type { GameKey } from "@/config/games";
import { gameId } from "./leaderboard";

export type GameEventType =
  | "game_started"
  | "guess_submitted"
  | "game_completed"
  | "shared_result"
  | "streak_lost";

/** Emit one game event. Never throws. `metadata` always carries `{ gameKey, ... }`. */
export async function emitGameEvent(
  userId: string,
  key: GameKey,
  type: GameEventType,
  meta: Record<string, unknown> = {},
): Promise<void> {
  try {
    const entityId = await gameId(key);
    await prisma.activityEvent.create({
      data: {
        userId,
        eventType: type,
        entityType: "game",
        entityId,
        metadata: { gameKey: key, ...meta },
      },
    });
  } catch {
    // fire-and-forget: analytics must never fail a play.
  }
}
