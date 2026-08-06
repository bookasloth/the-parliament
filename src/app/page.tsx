import { redirect } from "next/navigation";
import { Homepage } from "@/components/homepage/Homepage";
import { optionalUser } from "@/modules/auth/session";

export const dynamic = "force-dynamic";

export default async function Page() {
  // Logged-in users skip the marketing landing (Facebook-style): straight to
  // the feed, or into onboarding if they haven't finished it.
  const user = await optionalUser();
  if (user) redirect(user.onboardingCompleted ? "/feed" : "/onboarding");

  return <Homepage />;
}
