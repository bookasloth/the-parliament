/**
 * Alfazy trophy catalogue — maps a (scope, period) champion to its display
 * identity. lucide-react icons only (member app convention; phosphor is admin).
 */

import { Trophy, Medal, Crown, Shield, ShieldCheck, Users, Award, type LucideIcon } from "lucide-react";

export type TrophyTone = "gold" | "brand" | "house";

export interface TrophyDef {
  label: string;
  Icon: LucideIcon;
  tone: TrophyTone;
}

/** key = `${scope}:${period}`. Missing combos fall back to DEFAULT_TROPHY. */
export const ALFAZY_TROPHIES: Record<string, TrophyDef> = {
  "individual:daily": { label: "Daily Champion", Icon: Medal, tone: "brand" },
  "individual:weekly": { label: "Weekly Champion", Icon: Trophy, tone: "gold" },
  "individual:monthly": { label: "Monthly Champion", Icon: Crown, tone: "gold" },
  "individual:yearly": { label: "Alfazy Legend", Icon: Crown, tone: "gold" },
  "house:daily": { label: "House Daily Winner", Icon: Shield, tone: "house" },
  "house:weekly": { label: "House Weekly Winner", Icon: Shield, tone: "house" },
  "house:monthly": { label: "House of the Month", Icon: ShieldCheck, tone: "house" },
  "house:yearly": { label: "House of the Year", Icon: ShieldCheck, tone: "gold" },
  "batch:daily": { label: "Batch Daily Winner", Icon: Users, tone: "brand" },
  "batch:weekly": { label: "Batch Weekly Winner", Icon: Users, tone: "brand" },
  "batch:monthly": { label: "Batch of the Month", Icon: Award, tone: "brand" },
  "batch:yearly": { label: "Batch Legends", Icon: Award, tone: "gold" },
};

export const DEFAULT_TROPHY: TrophyDef = { label: "Champion", Icon: Trophy, tone: "brand" };

export function trophyDef(scope: string, period: string): TrophyDef {
  return ALFAZY_TROPHIES[`${scope}:${period}`] ?? DEFAULT_TROPHY;
}

export const TROPHY_TONE_CLASS: Record<TrophyTone, string> = {
  gold: "text-amber-500 bg-amber-50 ring-amber-200",
  brand: "text-brand bg-brand-50 ring-brand-200",
  house: "text-gray-700 bg-gray-50 ring-gray-200",
};
