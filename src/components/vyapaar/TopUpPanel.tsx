"use client"

import { useState, useTransition } from "react"
import { COIN_PACKS, coinsForPack } from "@/config/vyapaar-coins"
import { topUpAction } from "@/modules/vyapaar/wallet-actions"

export function TopUpPanel() {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function buy(packId: string) {
    setMsg(null)
    start(async () => {
      const res = await topUpAction(packId)
      setMsg(res.ok ? `Balance: ${res.wallet.toLocaleString("en-IN")} coins` : res.error)
    })
  }

  return (
    <div className="grid gap-2">
      {COIN_PACKS.map((p) => (
        <button
          key={p.id}
          type="button"
          disabled={pending}
          onClick={() => buy(p.id)}
          className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <span>{coinsForPack(p).toLocaleString("en-IN")} coins</span>
          <span className="text-gray-500">{p.shells} shells</span>
        </button>
      ))}
      {msg && <p className="text-sm text-gray-600">{msg}</p>}
    </div>
  )
}
