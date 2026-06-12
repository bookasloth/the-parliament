// Auth commented out for UI testing
// import { auth } from "@/lib/auth"
// import { redirect } from "next/navigation"
// import { prisma } from "@/lib/prisma"

export default async function SettingsPage() {
  // const session = await auth()
  // if (!session?.user?.id) redirect("/auth/signin")

  // const user = await prisma.user.findUnique({
  //   where: { id: session.user.id },
  //   select: {
  //     legalName: true,
  //     email: true,
  //     username: true,
  //     status: true,
  //     profile: {
  //       select: {
  //         photoUrl: true,
  //         bio: true,
  //         city: true,
  //         profession: true,
  //       },
  //     },
  //   },
  // })

  // if (!user) redirect("/auth/signin")

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
            <p className="text-sm text-gray-500">Settings page — auth disabled for UI testing.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
