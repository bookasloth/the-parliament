import { requireUser } from "@/modules/auth/session"
import { ensureVyapaarEnrollment } from "@/modules/vyapaar/wallet"
import { WalletBadge } from "@/components/vyapaar/WalletBadge"
import { CreateRoomButton } from "@/components/vyapaar/CreateRoomButton"
import { JoinByCode } from "@/components/vyapaar/JoinByCode"
import { PublicLobbyList } from "@/components/vyapaar/PublicLobbyList"

export const dynamic = "force-dynamic"

export default async function VyapaarHub() {
  const user = await requireUser()
  await ensureVyapaarEnrollment(user.id) // one deliberate idempotent write; badge is a pure read

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vyapaar</h1>
        <WalletBadge userId={user.id} />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 font-semibold">Start a game</h2>
          <div className="grid gap-3">
            <CreateRoomButton />
            <JoinByCode />
          </div>
        </section>
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 font-semibold">Public rooms</h2>
          <PublicLobbyList />
        </section>
      </div>
    </div>
  )
}
