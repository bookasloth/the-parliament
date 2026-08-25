"use client"

import { useCallback, useEffect, useState } from "react"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { realtimeTokenAction } from "@/modules/vyapaar/match-actions"
import { CITIES } from "@/modules/vyapaar/engine/data"
import type { PublicView } from "@/modules/vyapaar/engine/view"
import type { Intent } from "@/modules/vyapaar/engine/state"

const MATCH_TOPIC = (id: string) => `vyapaar-match:${id}`

export function MatchBoard({ matchId, initialView }: { matchId: string; initialView: PublicView }) {
  const [view, setView] = useState<PublicView>(initialView)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const you = view.you

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/vyapaar/${matchId}/view`, { cache: "no-store" })
    if (res.ok) setView((await res.json()).view)
  }, [matchId])

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof getSupabaseBrowser>["channel"]> | null = null
    let cancelled = false
    let refreshTimer: ReturnType<typeof setTimeout>
    const sb = getSupabaseBrowser()

    // Mirrors ConversationView's connect(): self-reschedules via setTimeout to
    // re-mint + re-apply the realtime auth token every 55min (token TTL is 1h),
    // without re-subscribing the channel (guarded by the `channel` closure var).
    async function connect() {
      const auth = await realtimeTokenAction()
      if (!auth || cancelled) return
      await sb.realtime.setAuth(auth.token)
      refreshTimer = setTimeout(connect, 55 * 60 * 1000)
      if (channel) return
      channel = sb.channel(MATCH_TOPIC(matchId), { config: { private: true } })
      channel.on("broadcast", { event: "state" }, () => { void refetch() }).subscribe()
    }

    connect()
    return () => {
      cancelled = true
      clearTimeout(refreshTimer)
      if (channel) { void sb.removeChannel(channel); channel = null }
    }
  }, [matchId, refetch])

  const send = useCallback(async (intent: Intent) => {
    setErr(null); setBusy(true)
    try {
      const res = await fetch(`/api/vyapaar/${matchId}/intent`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent }),
      })
      const data = await res.json()
      if (!res.ok) setErr(data.error ?? "error")
      else setView(data.view)
    } finally {
      setBusy(false)
    }
  }, [matchId])

  const myTurn = view.active === you && !view.ended
  const canManage = myTurn && (view.phase === "roll" || view.phase === "manage")
  const myCities = view.cities.map((c, id) => ({ ...c, id })).filter((c) => c.owner === you)

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Vyapaar match</h1>
        <span className="text-sm text-gray-500">Round {view.round} · pot {view.pot.toLocaleString("en-IN")} · {view.ended ? `over — winner seat ${view.winner}` : `seat ${view.active}'s turn`}</span>
      </header>

      <section className="grid gap-2 sm:grid-cols-2">
        {view.players.map((p, seat) => (
          <div key={seat} className={`rounded-lg border p-3 text-sm ${seat === view.active ? "border-brand" : "border-gray-200"}`}>
            <div className="font-medium">{p.name} {seat === you && "(you)"}</div>
            <div className="text-gray-600">cash {p.cash.toLocaleString("en-IN")} · pos {p.pos} · net {Math.round(p.netWorth).toLocaleString("en-IN")}{p.halted ? " · halted" : ""}</div>
          </div>
        ))}
      </section>

      {err && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

      <section className="flex flex-wrap gap-2">
        {myTurn && view.phase === "roll" && <button disabled={busy} onClick={() => send({ type: "roll" })} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Roll</button>}
        {myTurn && view.phase === "buy" && view.pendingCity !== null && <>
          <button disabled={busy} onClick={() => send({ type: "buy" })} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Buy {CITIES[view.pendingCity].name} ({CITIES[view.pendingCity].price})</button>
          <button disabled={busy} onClick={() => send({ type: "decline" })} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Decline</button>
        </>}
        {myTurn && view.phase === "buy" && view.pendingHub !== null && <>
          <button disabled={busy} onClick={() => send({ type: "buy" })} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Buy hub</button>
          <button disabled={busy} onClick={() => send({ type: "decline" })} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Decline</button>
        </>}
        {view.phase === "auction" && view.auction && !view.auction.bidded[you] && <BidControl busy={busy} max={view.players[you].cash} onBid={(amount) => send({ type: "bid", amount })} />}
        {myTurn && view.phase === "manage" && <button disabled={busy} onClick={() => send({ type: "end_turn" })} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">End turn</button>}
      </section>

      {canManage && myCities.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Your cities</h2>
          <ul className="grid gap-1">
            {myCities.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded border border-gray-200 px-3 py-1.5 text-sm">
                <span>{CITIES[c.id].name} · L{c.level}{c.mortgaged ? " · mortgaged" : ""}</span>
                <span className="flex gap-1">
                  <button disabled={busy} onClick={() => send({ type: "develop", cityId: c.id })} className="rounded border px-2 py-0.5 text-xs disabled:opacity-50">Develop</button>
                  {c.mortgaged
                    ? <button disabled={busy} onClick={() => send({ type: "unmortgage", cityId: c.id })} className="rounded border px-2 py-0.5 text-xs disabled:opacity-50">Unmortgage</button>
                    : <button disabled={busy} onClick={() => send({ type: "mortgage", cityId: c.id })} className="rounded border px-2 py-0.5 text-xs disabled:opacity-50">Mortgage</button>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.trade && view.trade.to === you && (
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="mb-2 font-medium">Seat {view.trade.from} proposed a trade.</p>
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => send({ type: "respond_trade", accept: true })} className="rounded-lg bg-brand px-3 py-1.5 text-white disabled:opacity-50">Accept</button>
            <button disabled={busy} onClick={() => send({ type: "respond_trade", accept: false })} className="rounded-lg border px-3 py-1.5 disabled:opacity-50">Decline</button>
          </div>
        </section>
      )}

      <TradePropose view={view} you={you} busy={busy} onPropose={(intent) => send(intent)} />
    </div>
  )
}

function BidControl({ busy, max, onBid }: { busy: boolean; max: number; onBid: (n: number) => void }) {
  const [amt, setAmt] = useState(0)
  return (
    <span className="flex items-center gap-1">
      <input type="number" min={0} max={max} value={amt} onChange={(e) => setAmt(Math.max(0, Math.min(max, Number(e.target.value))))} className="w-24 rounded border px-2 py-1 text-sm" />
      <button disabled={busy} onClick={() => onBid(amt)} className="rounded-lg bg-brand px-3 py-1.5 text-sm text-white disabled:opacity-50">Bid</button>
    </span>
  )
}

function TradePropose({ view, you, busy, onPropose }: { view: PublicView; you: number; busy: boolean; onPropose: (i: Intent) => void }) {
  const [to, setTo] = useState<number | "">("")
  const [give, setGive] = useState<number[]>([])
  const [get, setGet] = useState<number[]>([])
  const [giveCash, setGiveCash] = useState(0)
  const [getCash, setGetCash] = useState(0)
  if (view.ended || view.trade) return null
  const mine = view.cities.map((c, id) => ({ ...c, id })).filter((c) => c.owner === you && c.level === 0 && !c.mortgaged)
  const theirs = to === "" ? [] : view.cities.map((c, id) => ({ ...c, id })).filter((c) => c.owner === to && c.level === 0 && !c.mortgaged)
  const toggle = (arr: number[], set: (a: number[]) => void, id: number) => set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])
  return (
    <details className="rounded-lg border border-gray-200 p-3 text-sm">
      <summary className="cursor-pointer font-semibold">Propose a trade</summary>
      <div className="mt-2 grid gap-2">
        <label>To seat:{" "}
          <select value={to} onChange={(e) => { setTo(e.target.value === "" ? "" : Number(e.target.value)); setGet([]) }} className="rounded border px-2 py-1">
            <option value="">—</option>
            {view.players.map((p, seat) => seat !== you ? <option key={seat} value={seat}>{seat}: {p.name}</option> : null)}
          </select>
        </label>
        <div>You give: {mine.map((c) => <label key={c.id} className="mr-2"><input type="checkbox" checked={give.includes(c.id)} onChange={() => toggle(give, setGive, c.id)} /> {CITIES[c.id].name}</label>)} + cash <input type="number" min={0} value={giveCash} onChange={(e) => setGiveCash(Math.max(0, Number(e.target.value)))} className="w-20 rounded border px-1" /></div>
        <div>You get: {theirs.map((c) => <label key={c.id} className="mr-2"><input type="checkbox" checked={get.includes(c.id)} onChange={() => toggle(get, setGet, c.id)} /> {CITIES[c.id].name}</label>)} + cash <input type="number" min={0} value={getCash} onChange={(e) => setGetCash(Math.max(0, Number(e.target.value)))} className="w-20 rounded border px-1" /></div>
        <button disabled={busy || to === ""} onClick={() => onPropose({ type: "propose_trade", to: to as number, give: { cash: giveCash, cities: give }, get: { cash: getCash, cities: get } })} className="justify-self-start rounded-lg bg-brand px-3 py-1.5 text-white disabled:opacity-50">Send offer</button>
      </div>
    </details>
  )
}
