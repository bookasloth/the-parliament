import { redirect } from "next/navigation";

// Canonical leaderboard lives at /leaderboard/[scope]/[period]. Default view:
export default function LeaderboardIndex() {
  redirect("/games/alfazy/leaderboard/individual/daily");
}
