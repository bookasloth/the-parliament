import { redirect } from "next/navigation";
import { Homepage } from "@/components/homepage/Homepage";
import { optionalUser } from "@/modules/auth/session";
import { getDefaultSchoolId } from "@/lib/school";
import { listEventsShared } from "@/modules/events/service";
import { listGroupsShared } from "@/modules/groups/service";

export const dynamic = "force-dynamic";

export default async function Page() {
  // Logged-in users skip the marketing landing (Facebook-style): straight to
  // the feed, or into onboarding if they haven't finished it.
  const user = await optionalUser();
  if (user) redirect(user.onboardingCompleted ? "/feed" : "/onboarding");

  const schoolId = await getDefaultSchoolId();
  const [allEvents, groups] = schoolId
    ? await Promise.all([
        listEventsShared(schoolId).catch(() => []),
        listGroupsShared(schoolId).catch(() => []),
      ])
    : [[], []];
  const events = allEvents.filter((e) => !e.isPast).slice(0, 3);

  return <Homepage events={events} groups={groups.slice(0, 3)} />;
}
