import { Coins } from "lucide-react"
import { getVyapaarBalance } from "@/modules/vyapaar/wallet"

export async function WalletBadge({ userId }: { userId: string }) {
  const balance = await getVyapaarBalance(userId)
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
      <Coins className="h-4 w-4" aria-hidden />
      {balance.toLocaleString("en-IN")}
    </span>
  )
}
