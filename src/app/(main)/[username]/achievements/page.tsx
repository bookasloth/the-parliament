import { redirect } from "next/navigation";

// The achievements collection now lives as the "Badges" tab on the profile.
// Kept as a permanent redirect so old links / notifications don't 404.
export default async function AchievementsRedirect({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  redirect(`/${username}/badges`);
}
