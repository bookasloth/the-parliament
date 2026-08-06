/** Human labels for Alfazy periods/anchors. Pure, client-safe (no DB import). */
import type { Period } from "./periods";

/** Leaderboard scopes. Defined here (client-safe) so client components can import
 *  the list without pulling in leaderboard.ts's prisma dependency. */
export type Scope = "individual" | "house" | "batch";
export const SCOPES: Scope[] = ["individual", "house", "batch"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatAnchor(period: Period, anchor: string): string {
  switch (period) {
    case "daily": {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(anchor);
      if (!m) return anchor;
      return `${MONTHS[+m[2] - 1].slice(0, 3)} ${+m[3]}, ${m[1]}`;
    }
    case "weekly": {
      const m = /^(\d{4})-W(\d{2})$/.exec(anchor);
      if (!m) return anchor;
      return `Week ${+m[2]} · ${m[1]}`;
    }
    case "monthly": {
      const m = /^(\d{4})-(\d{2})$/.exec(anchor);
      if (!m) return anchor;
      return `${MONTHS[+m[2] - 1]} ${m[1]}`;
    }
    case "yearly":
      return anchor;
    case "all":
      return "All-time";
  }
}

export const PERIOD_LABEL: Record<Period, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
  all: "All-time",
};

export const SCOPE_LABEL: Record<"individual" | "house" | "batch", string> = {
  individual: "Individual",
  house: "House",
  batch: "Batch",
};
