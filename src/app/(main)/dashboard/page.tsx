import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button
            type="submit"
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Sign Out
          </button>
        </form>
      </div>
      <p className="mt-4 text-gray-600">
        Welcome, {session.user.name ?? session.user.email}
      </p>
    </div>
  );
}
