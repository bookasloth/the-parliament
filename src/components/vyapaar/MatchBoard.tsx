"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { motion, useReducedMotion, useAnimation } from "framer-motion"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { realtimeTokenAction } from "@/modules/vyapaar/match-actions"
import { CITIES, COMPANIES, COMPANY_CATS, COMPANY_POS, upgradeCost } from "@/modules/vyapaar/engine/data"
import { BOARD, CITY_POS } from "@/modules/vyapaar/engine/board"
import { coachTips, type Tip } from "@/modules/vyapaar/coach"
import { MatchResults } from "./MatchResults"
import type { PublicView } from "@/modules/vyapaar/engine/view"
import type { Intent, TradeSide } from "@/modules/vyapaar/engine/state"

const MATCH_TOPIC = (id: string) => `vyapaar-match:${id}`

// bright zone palette (strip bg) + darkened text-on-milk variant
const ZONE_BG = ["#FE5100", "#4AB765", "#FF4D93", "#269CEF", "#FFCC1C"]
const ZONE_TX = ["#E04800", "#2E9455", "#E43D80", "#1E86D0", "#C08A00"]
const ZONE_DARK = [false, false, false, false, true] // yellow → dark text on strip
const SEAT_COL = ["#269CEF", "#FFCC1C", "#4AB765", "#FF4D93", "#FE5100", "#8b6fd0"]

const inr = (n: number) => n.toLocaleString("en-IN")

// Boxed how-to tutorial shown left of the dice (numbered, icon + zone-colour accent).
const HOWTO: { icon: string; head: string; body: string; color: string }[] = [
  { icon: "🎲", head: "Roll & move.", body: "Land on a tile and act on what's there.", color: "#269CEF" },
  { icon: "🏙️", head: "Buy it.", body: "Snap up the cities & companies you land on.", color: "#4AB765" },
  { icon: "🎯", head: "Own 3 of a zone.", body: "That locks the zone — undeveloped rent doubles.", color: "#FF4D93" },
  { icon: "🏗️", head: "Build up.", body: "Add houses → hotels to spike the rent you charge.", color: "#FE5100" },
  { icon: "🤝", head: "Trade smart.", body: "Swap cards to complete your zones faster.", color: "#C08A00" },
]

// Human-readable engine error codes (the API returns raw codes). Anything not
// listed falls through to the raw code so nothing is silently swallowed.
const ERR_MSG: Record<string, string> = {
  not_your_turn: "It's not your turn yet.",
  cannot_roll_now: "You can't roll right now.",
  nothing_to_buy: "There's nothing to buy here.",
  nothing_to_decline: "There's nothing to decline.",
  insufficient_funds: "You don't have enough cash.",
  cannot_manage_now: "You can only build right after you land on your own property.",
  cannot_end_now: "You can't end your turn right now.",
  not_owner: "You don't own this property.",
  no_set_control: "You need all three cities of this colour set before you can build a house.",
  uneven_build: "Build evenly — raise the lowest cities in the set first.",
  max_level: "This property is already fully developed.",
  must_be_on_city: "Land on this city to build a hotel here.",
  no_payment: "That payment was already resolved.",
  not_your_payment: "That payment isn't yours to confirm.",
  mortgaged: "This property is mortgaged — clear it first.",
  already_mortgaged: "This property is already mortgaged.",
  sell_upgrades_first: "Sell the buildings before mortgaging.",
  bid_exceeds_cash: "Your bid is more than your cash.",
  already_bid: "You've already bid in this auction.",
  rate_limited: "You're going too fast — try again in a moment.",
  game_over: "The game is over.",
  trade_charge_unaffordable: "Both traders need ₹500+ cash for the trader's-union charge.",
  trade_invalid: "That trade is no longer valid.",
  bad_give: "You can't trade one card of a set that already has houses.",
  bad_get: "They can't trade one card of a set that already has houses.",
}
// Errors that mean "you can't build/manage that here" — handled softly (close the deed +
// gentle hint) rather than shown as a red error. Build-RULE violations (no set control,
// uneven build) are deliberately NOT soft: they surface the precise ERR_MSG so a player who
// tries to build without the whole set is told exactly why.
const SOFT_ERRORS = new Set(["cannot_manage_now", "max_level", "mortgaged"])

// Wide 13×9 ring cell → [col,row]. Corners: 0 Start, 12 Monsoon, 20 Mandi, 32 Tax Raid.
function cellPos(i: number): [number, number] {
  if (i === 0) return [13, 9]
  if (i < 12) return [13 - i, 9]         // bottom row 1..11 → cols 12..2
  if (i === 12) return [1, 9]
  if (i < 20) return [1, 9 - (i - 12)]   // left col 13..19 → rows 8..2
  if (i === 20) return [1, 1]
  if (i < 32) return [1 + (i - 20), 1]   // top row 21..31 → cols 2..12
  if (i === 32) return [13, 1]
  return [13, 1 + (i - 32)]              // right col 33..39 → rows 2..8
}

// Token anchor as % of the board box. Non-corner tiles anchor on their INNER ring
// edge (toward the hub) so the piece sits just off the cell into the track interior;
// corner tiles keep the piece inside the cell.
const CORNERS = new Set([0, 12, 20, 32])
function tokenAnchor(i: number): { x: number; y: number } {
  const [col, row] = cellPos(i)
  const cw = 100 / 13, ch = 100 / 9
  let x = (col - 0.5) * cw, y = (row - 0.5) * ch
  if (!CORNERS.has(i)) {
    if (row === 9) y = (row - 1) * ch        // bottom row → inner edge is the top
    else if (row === 1) y = row * ch          // top row → inner edge is the bottom
    else if (col === 1) x = col * cw          // left col → inner edge is the right
    else if (col === 13) x = (col - 1) * cw   // right col → inner edge is the left
  }
  return { x, y }
}
// The ring indices a piece steps through moving from `from` to `to` (forward, wrapping).
// A non-forward or long jump (e.g. jail teleport) resolves straight to the destination.
function ringPath(from: number, to: number): number[] {
  const fwd = (to - from + 40) % 40
  if (fwd === 0 || fwd > 12) return [to]
  const out: number[] = []
  for (let k = 1; k <= fwd; k++) out.push((from + k) % 40)
  return out
}

const SPECIAL_LABEL: Record<string, string> = {
  start: "START", monsoon: "JAIL", mandi: "MANDI", taxraid: "TAX RAID",
}
const EVENT_LABEL: Record<string, string> = {
  tax_return: "TAX RETURN", married: "GOT MARRIED", festival: "FESTIVAL", ed_raid: "ED RAID", jnv_revisit: "JNV REVISIT",
}
// Friendly "what happened when you landed" lines for the status under the Roll button.
const EVENT_MSG: Record<string, string> = {
  tax_return: "Tax return — money back!",
  married: "You got married — everyone pays you 🎉",
  festival: "Festival time!",
  ed_raid: "ED Raid — you owe the bank 😬",
  jnv_revisit: "You revisited JNV 🏫",
}
const LANDING_MSG: Record<string, string> = {
  start: "You passed Start",
  monsoon: "Jail — just visiting",
  mandi: "Mandi — you scooped the bonus 💰",
  taxraid: "Tax Raid — off to jail! 🚔",
}

// minimal inline icons
// Lighten (pct>0) or darken (pct<0) a #rrggbb toward white/black by |pct| (0..1).
function shade(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16)
  const t = pct < 0 ? 0 : 255, p = Math.abs(pct)
  const r = Math.round((t - ((n >> 16) & 255)) * p) + ((n >> 16) & 255)
  const g = Math.round((t - ((n >> 8) & 255)) * p) + ((n >> 8) & 255)
  const b = Math.round((t - (n & 255)) * p) + (n & 255)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}
const houseSVGc = (c: string) => `<svg viewBox="0 0 16 16" style="color:${c}"><path d="M8 2 14.5 7.5V14.5H1.5V7.5Z" fill="currentColor"/></svg>`
const hotelSVGc = (c: string) => `<svg viewBox="0 0 16 16" style="color:${c}"><path d="M2 15V5h6v10Zm7 0V8h5v7Z" fill="currentColor"/></svg>`
// Houses = a light shade of the city's zone colour, hotels = a dark shade — so buildings
// read as belonging to that city instead of a generic green/red.
const buildIcons = (level: number, zone?: number) => {
  const base = zone != null ? ZONE_BG[zone] : "#4AB765"
  const houseC = zone != null ? shade(base, 0.32) : "#4AB765"
  const hotelC = zone != null ? shade(base, -0.3) : "#FE5100"
  const hotels = Math.max(0, level - 3)
  const houses = level <= 3 ? level : 0
  return hotelSVGc(hotelC).repeat(hotels) + houseSVGc(houseC).repeat(houses)
}

// Turn an engine event into a human game-log line (₹, first names). Unknown events → null.
function logLine(e: Record<string, unknown>, players: PublicView["players"]): string | null {
  const nm = (s: unknown) => (typeof s === "number" ? (players[s]?.name.split(" ")[0] ?? `seat ${s}`) : "?")
  const rup = (n: unknown) => `₹${Number(n).toLocaleString("en-IN")}`
  const city = (i: unknown) => CITIES[i as number]?.name ?? "?"
  switch (e.type) {
    // Rolls are intentionally NOT logged — the game log shows actions only.
    case "buy": return `${nm(e.seat)} bought ${city(e.cityId)} for ${rup(e.amount)}`
    case "buy_company": return `${nm(e.seat)} bought ${COMPANIES[e.companyIndex as number]?.short ?? "?"} for ${rup(e.amount)}`
    case "rent_pending": return `${nm(e.seat)} owes ${rup(e.amount)} rent to ${nm(e.to)}`
    case "rent_void": return `rent to ${nm(e.to)} was voided`
    case "company_fee": return `${nm(e.seat)} paid ${rup(e.amount)} service`
    case "salary": return `${nm(e.seat)} got ${rup(e.amount)} salary`
    case "mandi": return `${nm(e.seat)} got ${rup(e.amount)} to spend at the mandi`
    case "event":
      switch (e.event) {
        case "tax_return": return `${nm(e.seat)} got a ₹1,000 tax return`
        case "married": return `${nm(e.seat)} collected ₹500 from everyone (wedding)`
        case "festival": return `${nm(e.seat)} paid ₹500 to everyone (festival)`
        case "ed_raid": return `${nm(e.seat)} was ED-raided for ₹1,000`
        case "jnv_revisit": return `${nm(e.seat)} paid ₹6,000 hosting the JNV revisit`
        default: return null
      }
    case "auction_won": return `${nm(e.seat)} won an auction for ${rup(e.amount)}`
    case "develop": return `${nm(e.seat)} built on ${city(e.cityId)}`
    case "mortgage": return `${nm(e.seat)} mortgaged ${city(e.cityId)}`
    case "unmortgage": return `${nm(e.seat)} cleared ${city(e.cityId)}`
    case "taxraid": case "jail_doubles": return `${nm(e.seat)} → jail`
    case "bribe": return `${nm(e.seat)} bribed out of jail (${rup(e.amount)})`
    case "trade_proposed": return `${nm(e.seat)} proposed a trade to ${nm(e.to)}`
    case "trade_accepted": return `${nm(e.from)} & ${nm(e.to)} traded`
    case "trade_charge": return `trader's-union charge: ${rup(e.costEach)} each`
    case "trade_declined": return `a trade was declined`
    case "trade_countered": return `${nm(e.seat)} countered with a new offer`
    case "trade_withdrawn": return `${nm(e.seat)} withdrew a trade`
    case "trade_expired": return `a trade offer expired`
    case "trade_cancelled": return `a trade was cancelled`
    case "left": return Number(e.amount) > 0 ? `${nm(e.seat)} left — cashed out ${rup(e.amount)}` : `${nm(e.seat)} left the game`
    case "payment_collected": return `${nm(e.seat)} claimed ${rup(e.amount)}`
    case "payment_paid": return `${nm(e.seat)} paid ${rup(e.amount)}`
    case "payment_penalty": return `${nm(e.seat)} missed a payment — charged double`
    case "payment_forfeited": return `${nm(e.seat)} forfeited ${rup(e.amount)}`
    case "restructure": return `${nm(e.seat)} restructured (+${rup(e.amount)})`
    case "game_over": return `${nm(e.seat)} won the game`
    default: return null
  }
}

// Signed cash change for YOU from a money event (+in / −out), with a label. Null if it
// doesn't move your money. Event-card flows (married/ED raid) don't carry a typed amount
// yet, so they're not itemised here — the running balance still reflects them.
function moneyDelta(e: Record<string, unknown>, you: number, players: PublicView["players"]): { delta: number; label: string } | null {
  const nm = (s: unknown) => (typeof s === "number" ? (players[s]?.name.split(" ")[0] ?? "a player") : "the bank")
  const why = (r: unknown) => { const s = PAYMENT_REASON[r as string] ?? String(r ?? "payment"); return s.charAt(0).toUpperCase() + s.slice(1) }
  const cty = (i: unknown) => CITIES[i as number]?.name ?? "property"
  // Trader's-union charge carries no single `amount` — resolve YOUR share first, before the
  // amount guard below. Traders pay costEach; every other player receives 2×poolEach (one
  // share from each trader).
  if (e.type === "trade_charge") {
    const traders = (e.traders as number[]) ?? []
    const rest = (e.rest as number[]) ?? []
    if (traders.includes(you)) return { delta: -Number(e.costEach || 0), label: "Trader's-union charge" }
    if (rest.includes(you)) return { delta: 2 * Number(e.poolEach || 0), label: "Trader's-union payout" }
    return null
  }
  const amt = Number(e.amount) || 0
  if (amt <= 0) return null
  if (e.seat !== you) return null
  const r = String(e.reason ?? "")
  switch (e.type) {
    case "buy": return { delta: -amt, label: `Snapped up ${cty(e.cityId)} 🏙️` }
    case "buy_company": case "auction_won": return { delta: -amt, label: "Bought a company 🏢" }
    case "develop": return { delta: -amt, label: `Built up ${cty(e.cityId)} 🏗️` }
    case "sell": return { delta: amt, label: `Sold ${cty(e.cityId)} back 💸` }
    // rent + company_fee + mandi + event flows all move money via payment_paid/collected.
    case "salary": return { delta: amt, label: "Payday! 💰" }
    case "gst": return { delta: -amt, label: "GST bite" }
    case "income": return { delta: -amt, label: "Income tax" }
    case "restructure": return { delta: amt, label: "Restructure advance" }
    case "bribe": return { delta: -amt, label: "Bribed out of jail 🔓" }
    case "left": return { delta: amt, label: "Cashed out" }
    case "payment_collected": return { delta: amt, label:
      r === "rent" ? "Rent rolled in 🤑"
      : r === "mandi" ? "Mandi windfall 🎁"
      : r === "event:married" ? "You got married — everyone chipped in 💍"
      : `${why(e.reason)} — money in 🤑` }
    case "payment_paid": return { delta: -amt, label:
      r === "rent" ? `Landed on ${nm(e.to)}'s city 😬`
      : r === "company_fee" ? `${nm(e.to)}'s service fee 🧾`
      : r === "event:festival" ? "Festival — you treated everyone 🎉"
      : r === "event:jnv_revisit" ? "Hosted the JNV revisit 🎓"
      : r === "event:ed_raid" ? "ED raid 🚨"
      : `${why(e.reason)} to ${nm(e.to)}` }
    case "payment_penalty": return { delta: -2 * amt, label: `${why(e.reason)} slipped — paid double 😱` }
    default: return null
  }
}

type MoneyEntry = { d: { delta: number; label: string }; i: number }

// Optimistic view mutators — applied the instant you click a confirmation button so the
// card/action disappears with no round-trip wait; the server view then replaces it (or a
// refetch rolls it back on error). Deliberately light: they clear the acted-on card and
// adjust YOUR cash; ownership/turn reconcile from the authoritative response ~1 tick later.
const optimisticPay = (p: PublicView["payments"][number], you: number) => (v: PublicView): PublicView => ({
  ...v,
  players: v.players.map((pl, i) => (i === you ? { ...pl, cash: pl.cash + (p.dir === "pay" ? -p.amount : p.amount) } : pl)),
  payments: v.payments.filter((x) => x.id !== p.id),
})
const optimisticDropTrade = (id: number) => (v: PublicView): PublicView => ({ ...v, trades: v.trades.filter((t) => t.id !== id) })

// A city is NOT tradeable if any city in its colour set (same owner) carries houses — giving
// one away would strand the buildings on a broken set. Mirrors engine setHasDevelopment; the
// engine is authoritative, this just keeps locked cities out of the trade pills.
const setHasHouses = (view: PublicView, seat: number, zone: number) =>
  view.cities.some((c, id) => c.owner === seat && CITIES[id].zone === zone && c.level > 0)
const tradeable = (view: PublicView, seat: number) => (c: { owner: number | null; level: number; mortgaged: boolean; id: number }) =>
  c.owner === seat && c.level === 0 && !c.mortgaged && !setHasHouses(view, seat, CITIES[c.id].zone)
const optimisticBribe = (you: number, cost: number) => (v: PublicView): PublicView => ({
  ...v,
  phase: v.active === you ? "roll" : v.phase,
  players: v.players.map((pl, i) => (i === you ? { ...pl, cash: pl.cash - cost, halted: 0 } : pl)),
})

export function MatchBoard({ matchId, initialView, initialTurnExpiresAt, initialGameEndsAt = null, playerImages = [], playerTokens = [], roomCode = null }: { matchId: string; initialView: PublicView; initialTurnExpiresAt: string | null; initialGameEndsAt?: string | null; playerImages?: (string | null)[]; playerTokens?: (string | null)[]; roomCode?: string | null }) {
  const [view, setView] = useState<PublicView>(initialView)
  const [turnExpiresAt, setTurnExpiresAt] = useState<string | null>(initialTurnExpiresAt)
  const [gameEndsAt, setGameEndsAt] = useState<string | null>(initialGameEndsAt)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [openTile, setOpenTile] = useState<number | null>(null) // board position of the open deed
  const [onlineSeats, setOnlineSeats] = useState<Set<number>>(new Set())
  const [showReport, setShowReport] = useState(false)
  const [copied, setCopied] = useState(false)
  const [eventFx, setEventFx] = useState<{ id: string; pos: number; seat: number; round: number; key: number } | null>(null)
  const reduce = useReducedMotion()
  const you = view.you
  // Timestamp of our last successful own action. The server broadcasts a "state"
  // nudge to everyone including us, but our POST already returned the fresh view —
  // so we skip the redundant self-refetch for a short window after acting.
  const lastActRef = useRef(0)

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/vyapaar/${matchId}/view`, { cache: "no-store" })
    if (res.ok) { const d = await res.json(); setView(d.view); setTurnExpiresAt(d.turnExpiresAt ?? null); setGameEndsAt(d.gameEndsAt ?? null); setErr(null) }
  }, [matchId])

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof getSupabaseBrowser>["channel"]> | null = null
    let cancelled = false
    let refreshTimer: ReturnType<typeof setTimeout>
    const sb = getSupabaseBrowser()
    async function connect() {
      const auth = await realtimeTokenAction()
      if (!auth || cancelled) return
      await sb.realtime.setAuth(auth.token)
      refreshTimer = setTimeout(connect, 55 * 60 * 1000)
      if (channel) return
      channel = sb.channel(MATCH_TOPIC(matchId), { config: { private: true, presence: { key: String(you) } } })
      channel
        .on("broadcast", { event: "state" }, () => { if (Date.now() - lastActRef.current > 1500) void refetch() })
        .on("presence", { event: "sync" }, () => {
          const st = channel!.presenceState() as Record<string, Array<{ seat?: number }>>
          const seats = new Set<number>()
          Object.values(st).forEach((arr) => arr.forEach((m) => { if (typeof m.seat === "number") seats.add(m.seat) }))
          setOnlineSeats(seats)
        })
        .subscribe((status: string) => { if (status === "SUBSCRIBED") void channel!.track({ seat: you }) })
    }
    connect()
    return () => { cancelled = true; clearTimeout(refreshTimer); if (channel) { void sb.removeChannel(channel); channel = null } }
  }, [matchId, refetch])

  // Safety net: refetch periodically even without a realtime event, so a missed broadcast or a
  // stalled auto-resolve can never freeze the board at "resolving…".
  useEffect(() => {
    const t = setInterval(() => { void refetch() }, 8000)
    return () => clearInterval(t)
  }, [refetch])

  // When the game ends we show the full results breakdown and let the player click
  // through — no auto-redirect that could yank them away mid-read.
  const settlementHref = roomCode ? `/games/vyapaar/rooms/${roomCode}/settlements` : "/games/vyapaar"

  // Auto-open the deed the moment you must decide to buy — one fewer click than
  // clicking a rail button just to open the modal. Opens once per pending target,
  // so manually closing it to peek at the board doesn't fight you by reopening.
  const buyTarget = view.active === you && !view.ended && view.phase === "buy"
    ? (view.pendingCity !== null ? CITY_POS[view.pendingCity]
      : view.pendingCompany !== null ? COMPANY_POS[view.pendingCompany] : null)
    : null
  // After landing on your own developable city the turn pauses in `manage` — pop its
  // deed open so Develop is one glance away (mirrors the buy auto-open).
  const manageTarget = view.active === you && !view.ended && view.phase === "manage" && BOARD[view.players[you]?.pos ?? -1]?.kind === "city"
    ? view.players[you].pos : null
  const autoTarget = buyTarget ?? manageTarget
  const autoOpenedRef = useRef<number | null>(null)
  useEffect(() => {
    if (autoTarget !== null && autoOpenedRef.current !== autoTarget) {
      setOpenTile(autoTarget); autoOpenedRef.current = autoTarget
    } else if (autoTarget === null) {
      autoOpenedRef.current = null
    }
  }, [autoTarget])

  // Fire a landing effect when a fresh type:"event" appears at the log tail. Signature
  // (seat:event:round) dedupes reslices/refetches; the first sighting on mount only
  // records, so a pre-existing event never replays when you open the board.
  const lastEvSigRef = useRef<string | null>(null)
  const fxKeyRef = useRef(0)
  useEffect(() => {
    let ev: Record<string, unknown> | null = null
    for (let i = view.log.length - 1; i >= 0; i--) { const e = view.log[i] as Record<string, unknown>; if (e.type === "event") { ev = e; break } }
    const seat = ev ? (ev.seat as number) : null
    const sig = ev ? `${seat}:${String(ev.event)}:${view.round}` : null
    if (sig && sig !== lastEvSigRef.current) {
      const first = lastEvSigRef.current === null
      lastEvSigRef.current = sig
      if (!first && seat !== null) {
        setEventFx({ id: String(ev!.event), pos: view.players[seat]?.pos ?? 0, seat, round: view.round, key: ++fxKeyRef.current })
      }
    }
  }, [view])
  useEffect(() => {
    if (!eventFx) return
    const t = setTimeout(() => setEventFx(null), 5200)
    return () => clearTimeout(t)
  }, [eventFx])

  // `optimistic` (when given) mutates the local view the instant you click — the card/button
  // vanishes and your cash updates with no wait — then the server's authoritative view replaces
  // it on success, or a refetch restores the truth on error. Used for the confirmation-style
  // actions (payments, jail bribe, trade responses) that otherwise feel laggy.
  const send = useCallback(async (intent: Intent, closeDeed = false, action?: string, optimistic?: (v: PublicView) => PublicView) => {
    setErr(null)
    if (optimistic) { lastActRef.current = Date.now(); setView((prev) => optimistic(prev)) }
    setBusy(true)
    try {
      const res = await fetch(`/api/vyapaar/${matchId}/intent`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent }),
      })
      const data = await res.json()
      if (!res.ok) {
        const code = data.error ?? "error"
        if (optimistic) await refetch() // roll back the optimistic view to server truth
        // Develop/manage rejections aren't errors the player did wrong — close the
        // deed and give a gentle nudge instead of a red error box.
        if (SOFT_ERRORS.has(code)) { setOpenTile(null); setErr("Nothing to build here — roll the dice to continue.") }
        else {
          const msg = ERR_MSG[code] ?? code
          setErr(action ? `${action}: ${msg}` : msg)
        }
      } else { lastActRef.current = Date.now(); setView(data.view); setTurnExpiresAt(data.turnExpiresAt ?? null); if (closeDeed) setOpenTile(null) }
    } finally { setBusy(false) }
  }, [matchId, refetch])

  const myTurn = view.active === you && !view.ended
  const canManage = myTurn && (view.phase === "roll" || view.phase === "manage")
  const myCities = view.cities.map((c, id) => ({ ...c, id })).filter((c) => c.owner === you)
  const myCompanyIds = view.companies.map((o, ci) => ({ o, ci })).filter((x) => x.o === you).map((x) => x.ci)
  const leaderSeat = view.players.reduce((b, p, i) => (!p.left && p.score > view.players[b].score ? i : b), 0)
  // Last 5 meaningful actions (rolls are excluded in logLine), oldest → newest so
  // the freshest line sits at the bottom.
  const logLines = view.log.map((e, i) => ({ line: logLine(e as Record<string, unknown>, view.players), i })).filter((x) => x.line).slice(-5)
  // Notifications feed (B2): only events that involve YOU — your buys, rent to/from
  // you, trades you're party to — most recent last.
  const notifLines = view.log
    .map((e, i) => ({ e: e as Record<string, unknown>, i }))
    .filter(({ e }) => e.seat === you || e.to === you || e.from === you)
    .map(({ e, i }) => ({ line: logLine(e, view.players), i }))
    .filter((x) => x.line).slice(-10)
  const moneyEntries: MoneyEntry[] = view.log
    .map((e, i) => ({ d: moneyDelta(e as Record<string, unknown>, you, view.players), i }))
    .filter((x): x is MoneyEntry => x.d !== null)
    .slice(-4).reverse()
  // Strategy coach: top-5 ranked "what to do next" tips from the (public) board state.
  const tips = view.ended ? [] : coachTips(view)
  const iLeft = view.players[you]?.left ?? false

  // Who rolled the dice currently shown — the dice only tumble when it was YOU.
  const lastRollSeat = (() => { for (let i = view.log.length - 1; i >= 0; i--) { if ((view.log[i] as { type?: string }).type === "roll") return (view.log[i] as { seat?: number }).seat ?? null } return null })()
  // Plain-language line for where YOU just landed (shown after a roll).
  const landing = (() => {
    const t = BOARD[view.players[you]?.pos ?? 0]
    if (!t) return ""
    if (t.kind === "city") return `You landed on ${CITIES[t.cityId as number].name}`
    if (t.kind === "company") return `You reached ${COMPANIES[t.companyIndex as number].name}`
    if (t.kind === "event") return EVENT_MSG[t.eventId as string] ?? ""
    return LANDING_MSG[t.kind] ?? ""
  })()
  const rollStatus = view.ended ? "Game over"
    : !myTurn ? `Waiting for ${view.players[view.active]?.name?.split(" ")[0] ?? "…"}`
    : view.phase === "roll" ? "Your turn — roll the dice"
    : view.phase === "buy" ? (landing || "Buy it or decline")
    : view.phase === "manage" ? (landing ? `${landing} — develop or end your turn` : "Develop, then end your turn")
    : view.phase === "auction" ? "Auction in progress"
    : view.phase === "jail" ? `In jail — ${view.players[you]?.halted ?? 0} turn${(view.players[you]?.halted ?? 0) === 1 ? "" : "s"} left`
    : ""
  const bribeCost = 1000 + 250 * view.players.filter((p, i) => i !== you && !p.left).length

  // Leaving forfeits: assets return to the bank server-side, then we navigate out.
  const leaveGame = useCallback(async () => {
    if (view.ended || iLeft) { window.location.href = "/games/vyapaar"; return }
    if (!window.confirm("Leave the game? Your properties return to the bank and you forfeit this match.")) return
    await send({ type: "leave_game" })
    window.location.href = "/games/vyapaar"
  }, [view.ended, iLeft, send])

  return (
    <div className="vb">
      <style>{VB_CSS}</style>

      <header className="vb-top">
        <button type="button" onClick={leaveGame} disabled={busy} className="vb-exit">{iLeft || view.ended ? "← Exit" : "← Leave"}</button>
        <div className="vb-top-right">
          <div className="vb-you">
            {playerImages[you]
              ? <img src={playerImages[you]!} alt="" className="vb-you-img" />
              : <span className="vb-you-init" style={{ background: SEAT_COL[you % 6], color: you % 6 === 1 ? "#0F1111" : "#fff" }}>{(view.players[you]?.name ?? "?").charAt(0).toUpperCase()}</span>}
            <span className="vb-you-name">{(view.players[you]?.name ?? "").split(" ")[0]}</span>
          </div>
          {roomCode && (
            <button type="button" className="vb-code" title="Copy room code" onClick={() => { navigator.clipboard?.writeText(roomCode); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
              <span className="vb-code-lab">Room</span><b>{roomCode}</b>
              <span className="vb-code-ic" dangerouslySetInnerHTML={{ __html: copied ? CHECK_IC : COPY_IC }} />
            </button>
          )}
          <button type="button" className="vb-report-btn" onClick={() => setShowReport(true)}>Report a bug</button>
        </div>
      </header>

      <div className="vb-stage">
        <div className="vb-board-outer">
          <div className="vb-board">
            <div className="vb-grid">
              {BOARD.map((t) => {
                const [c, r] = cellPos(t.pos)
                // Player pieces are NOT drawn per-cell — they live in <TokenLayer/> as one
                // overlay so they can sit on the ring's inner edge and animate between tiles.
                const style = { gridColumn: c, gridRow: r }

                if (t.kind === "city") {
                  const id = t.cityId as number
                  const city = CITIES[id]
                  const cs = view.cities[id]
                  const dark = ZONE_DARK[city.zone]
                  return (
                    <div key={t.pos} className="vb-tile vb-city" style={style} onClick={() => setOpenTile(t.pos)}>
                      <div className="vb-strip" style={{ background: ZONE_BG[city.zone], color: dark ? "#0F1111" : "#fff" }}>
                        <span className="vb-nm">{city.name}</span>
                      </div>
                      <div className="vb-mid" dangerouslySetInnerHTML={{ __html: cs.mortgaged ? "" : buildIcons(cs.level, city.zone) }} />
                      <div className="vb-price" style={{ color: ZONE_TX[city.zone] }}>{cs.mortgaged ? "mortgaged" : inr(city.price)}</div>
                      {cs.owner !== null && <span className="vb-own" style={{ background: SEAT_COL[cs.owner % 6] }} />}
                    </div>
                  )
                }
                if (t.kind === "company") {
                  const ci = t.companyIndex as number
                  const co = COMPANIES[ci]
                  const owner = view.companies[ci]
                  return (
                    <div key={t.pos} className="vb-tile vb-company" style={style} onClick={() => setOpenTile(t.pos)}>
                      <div className="vb-strip vb-grey"><span className="vb-nm">{co.short}</span></div>
                      <div className="vb-mid"><span className="vb-cat" dangerouslySetInnerHTML={{ __html: CAT_ICON[co.category] }} /></div>
                      <div className="vb-price vb-co">{inr(co.buy)}</div>
                      {owner !== null && <span className="vb-own" style={{ background: SEAT_COL[owner % 6] }} />}
                    </div>
                  )
                }
                const corner = ["start", "monsoon", "mandi", "taxraid"].includes(t.kind)
                const evId = t.kind === "event" ? (t.eventId as string) : null
                return (
                  <div key={t.pos} className={`vb-tile ${corner ? "vb-corner vb-" + t.kind : "vb-special"}`} style={style}>
                    <span className="vb-sic" dangerouslySetInnerHTML={{ __html: (evId ? EVENT_ICON[evId] : SPECIAL_ICON[t.kind]) ?? "" }} />
                    <span className="vb-slb">{evId ? EVENT_LABEL[evId] : SPECIAL_LABEL[t.kind]}</span>
                  </div>
                )
              })}

              <div className="vb-hub">
                <aside className="vb-hub-side vb-howto">
                  <div className="vb-hub-h">How to play</div>
                  <ol className="vb-howto-steps">
                    {HOWTO.map((s, i) => (
                      <li key={i} className="vb-howto-step">
                        <span className="vb-howto-num" style={{ background: s.color }}>{i + 1}</span>
                        <span className="vb-howto-ic">{s.icon}</span>
                        <span className="vb-howto-tx"><b>{s.head}</b> {s.body}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="vb-howto-foot">💰 Richest Vyapaari wins — don&apos;t go broke!</div>
                </aside>
                <div className="vb-hub-mid">
                  <div className="vb-hub-name">व्यापार</div>
                  <Dice roll={view.lastRoll} seq={view.lastRoll ? `${view.lastRoll[0]}-${view.lastRoll[1]}` : "none"} animate={lastRollSeat === you} />
                  {myTurn && view.phase === "jail" ? (
                    <div className="vb-jail-acts">
                      <button className="vb-roll" disabled={busy || view.players[you].cash < bribeCost} onClick={() => send({ type: "bribe_jail" }, false, "Bribe", optimisticBribe(you, bribeCost))}>Bribe · ₹{inr(bribeCost)}</button>
                      <button className="vb-jail-sit" disabled={busy} onClick={() => send({ type: "serve_jail" }, false, "Jail")}>Sit it out</button>
                    </div>
                  ) : myTurn && view.phase === "manage"
                    ? <button className="vb-roll" disabled={busy} onClick={() => send({ type: "end_turn" }, false, "End turn")}>End turn</button>
                    : <button className="vb-roll" disabled={busy || !myTurn || view.phase !== "roll"} onClick={() => send({ type: "roll" }, false, "Roll")}>Roll</button>}
                  {rollStatus && <div className="vb-roll-status">{rollStatus}</div>}
                  <EndWarning gameEndsAt={gameEndsAt} round={view.round} ended={view.ended} />
                </div>
                <aside className="vb-hub-side vb-hubright">
                  <div className="vb-hubright-log">
                    <div className="vb-hub-h">Game log</div>
                    <div className="vb-log-list">
                      {logLines.length ? logLines.map((x) => <div key={x.i} className="vb-log-line">{x.line}</div>) : <div className="vb-log-empty">No moves yet</div>}
                    </div>
                  </div>
                  <div className="vb-hubright-coach">
                    <div className="vb-hub-h">Your coach</div>
                    <div className="vb-coach-list">
                      {tips.map((t, i) => (
                        <CoachTip key={i} tip={t} onOpen={(pos) => setOpenTile(pos)} />
                      ))}
                    </div>
                  </div>
                </aside>
              </div>

              <TokenLayer players={view.players} tokens={playerTokens} you={you} />
              {/* Jail bars overlay on the Monsoon/Jail corner (pos 12 = col1,row9). z above tokens
                  so a jailed piece reads as sitting BEHIND the bars. */}
              <div className="vb-jailbars" style={{ left: 0, top: `${(8 * 100) / 9}%`, width: `${100 / 13}%`, height: `${100 / 9}%` }} />
              {eventFx && <EventFX key={eventFx.key} fx={eventFx} reduce={!!reduce} />}
            </div>
          </div>
        </div>

        <div className="vb-rail">
          <div className="vb-quad">

            {/* A1 — game info: player photos + turn counter, no names */}
            <section className="vb-cell">
              <div className="vb-panel-head">Game info</div>
              <div className="vb-pgrid">
                {view.players.map((p, seat) => (
                  <PlayerCell
                    key={seat}
                    seat={seat}
                    p={p}
                    token={playerTokens[seat] ?? null}
                    isActive={seat === view.active}
                    isLeader={seat === leaderSeat}
                    online={onlineSeats.has(seat)}
                    cityZones={view.cities.map((c, id) => ({ ...c, id })).filter((c) => c.owner === seat).map((c) => CITIES[c.id].zone)}
                    companyCount={view.companies.filter((o) => o === seat).length}
                    counter={p.left ? "left" : seat === view.active && !view.ended ? <Countdown expiresAt={turnExpiresAt} ended={view.ended} /> : p.halted ? "halted" : " "}
                  />
                ))}
              </div>
              <div className="vb-panel-head vb-allprops-h">All properties</div>
              <div className="vb-allprops">
                {CITIES.map((c, id) => (
                  <PropChip
                    key={`c${id}`}
                    letter={c.name.charAt(0)}
                    bg={ZONE_BG[c.zone]}
                    dark={ZONE_DARK[c.zone]}
                    owner={view.cities[id].owner}
                    title={`${c.name}${view.cities[id].owner !== null ? " · " + (view.players[view.cities[id].owner!]?.name ?? "") : " · free"}`}
                    onOpen={() => setOpenTile(CITY_POS[id])}
                  />
                ))}
                {COMPANIES.map((co, ci) => (
                  <PropChip
                    key={`co${ci}`}
                    letter={co.short.charAt(0)}
                    bg="#8a8f98"
                    dark={false}
                    owner={view.companies[ci]}
                    title={`${co.name}${view.companies[ci] !== null ? " · " + (view.players[view.companies[ci]!]?.name ?? "") : " · free"}`}
                    onOpen={() => setOpenTile(COMPANY_POS[ci])}
                  />
                ))}
              </div>
            </section>

            {/* B1 — your money: live balance (odometer) + recent transactions */}
            <section className="vb-cell">
              <div className="vb-panel-head">Your balance</div>
              <MoneyMeter balance={view.players[you]?.cash ?? 0} entries={moneyEntries} />
            </section>

            {/* A2 — your properties (inline, click a card to open its deed) */}
            <section className="vb-cell">
              <div className="vb-panel-head">Your properties</div>
              <div className="vb-props-inline">
                {(myCities.length || myCompanyIds.length) ? <>
                  {myCities.map((c) => (
                    <button key={`c${c.id}`} className="vb-prop-card" style={{ borderLeftColor: ZONE_BG[CITIES[c.id].zone] }} onClick={() => setOpenTile(CITY_POS[c.id])}>
                      <span className="vb-prop-nm">{CITIES[c.id].name}</span>
                      <span className="vb-prop-sub">{c.mortgaged ? "mortgaged" : c.level === 0 ? "unbuilt" : `level ${c.level}`}</span>
                    </button>
                  ))}
                  {myCompanyIds.map((ci) => (
                    <button key={`co${ci}`} className="vb-prop-card" style={{ borderLeftColor: "var(--grey)" }} onClick={() => setOpenTile(COMPANY_POS[ci])}>
                      <span className="vb-prop-nm">{COMPANIES[ci].name}</span>
                      <span className="vb-prop-sub">company</span>
                    </button>
                  ))}
                </> : <div className="vb-tp-none">No property yet</div>}
              </div>
            </section>

            {/* B2 — notifications + everything that needs a decision */}
            <section className="vb-cell">
              <div className="vb-panel-head">Actions</div>
              <div className="vb-notif">
                {err && <p className="vb-err">{err}</p>}
                {view.phase === "auction" && view.auction && (
                  <div className="vb-auction">
                    <p className="vb-auction-head">Auction — place your bid · <Countdown expiresAt={turnExpiresAt} ended={view.ended} /></p>
                    <AuctionInfo auction={view.auction} />
                    {!view.auction.bidded[you]
                      ? <BidControl busy={busy} max={view.players[you].cash} onBid={(amount) => send({ type: "bid", amount })} />
                      : <p className="vb-auction-wait">Bid placed — waiting for the others…</p>}
                  </div>
                )}
                {myTurn && view.phase === "buy" && (
                  <button className="vb-act primary" disabled={busy} onClick={() => setOpenTile(buyTarget)}>Review purchase</button>
                )}
                {(view.payments ?? []).map((p) => (
                  <PaymentCard key={p.id} payment={p} view={view} busy={busy} onAction={send} />
                ))}
                {myTurn && view.youCanRestructure && (
                  <div className="vb-rescue">
                    <p className="vb-rescue-head">Falling behind?</p>
                    <p className="vb-rescue-body">Take ₹{inr(view.restructure.advance)} now — a reduced salary over your next {view.restructure.laps} laps repays it. One-time.</p>
                    <button className="vb-act primary" disabled={busy} onClick={() => send({ type: "restructure" })}>Restructure · +₹{inr(view.restructure.advance)}</button>
                  </div>
                )}
                {(view.trades ?? []).map((t) => (
                  <TradeCard key={t.id} trade={t} view={view} you={you} busy={busy} onAction={send} />
                ))}
                <TradePropose view={view} you={you} myTurn={myTurn} busy={busy} onPropose={(i) => send(i)} />
                {notifLines.length
                  ? notifLines.map((x) => <div key={x.i} className="vb-notif-line">{x.line}</div>)
                  : (!err && !(view.payments ?? []).length && <div className="vb-log-empty">No actions yet</div>)}
              </div>
            </section>

          </div>
        </div>
      </div>

      {openTile !== null && (
        <Deed
          pos={openTile}
          view={view}
          you={you}
          busy={busy}
          canManage={canManage}
          myTurn={myTurn}
          onClose={() => setOpenTile(null)}
          onAction={send}
        />
      )}

      {showReport && <ReportBug matchId={matchId} onClose={() => setShowReport(false)} />}

      {view.ended && (
        <div className="vb-scrim vb-scrim-results">
          <div className="vb-results-wrap">
            <MatchResults view={view} playerImages={playerImages} />
            <div className="vb-results-actions">
              <button className="vb-act primary" onClick={() => { window.location.href = settlementHref }}>View settlement</button>
              <button className="vb-act" onClick={() => { window.location.href = "/games/vyapaar" }}>Back to lobby</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Ticks down the seconds until the auto-return. Purely cosmetic — the actual redirect
// is driven by the setTimeout in MatchBoard.
function ReportBug({ matchId, onClose }: { matchId: string; onClose: () => void }) {
  const [text, setText] = useState("")
  const [state, setState] = useState<"idle" | "sending" | "done">("idle")
  const submit = async () => {
    if (!text.trim() || state === "sending") return
    setState("sending")
    try {
      const res = await fetch("/api/reports", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "vyapaar_bug", entityId: matchId, reason: "bug", details: text.trim() }),
      })
      setState(res.ok ? "done" : "idle")
    } catch { setState("idle") }
  }
  return (
    <div className="vb-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="vb-report">
        <div className="vb-report-hd"><span>Report a bug</span><button className="vb-props-x" onClick={onClose}>✕</button></div>
        {state === "done" ? (
          <div className="vb-report-body"><p className="vb-report-ok">Thanks — your report reached the admins.</p><button className="vb-act primary" onClick={onClose}>Close</button></div>
        ) : (
          <div className="vb-report-body">
            <p className="vb-report-sub">Describe what went wrong. Your match id is attached automatically.</p>
            <textarea className="vb-report-ta" value={text} maxLength={2000} placeholder="e.g. I rolled but my token never moved…" onChange={(e) => setText(e.target.value)} />
            <button className="vb-act primary" disabled={!text.trim() || state === "sending"} onClick={submit}>{state === "sending" ? "Sending…" : "Send report"}</button>
          </div>
        )}
      </div>
    </div>
  )
}

function Countdown({ expiresAt, ended }: { expiresAt: string | null; ended: boolean }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    if (!expiresAt || ended) { setNow(null); return }
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [expiresAt, ended])
  if (!expiresAt || ended || now === null) return null
  const secs = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000))
  return <span className={`vb-count ${secs <= 5 ? "low" : ""}`}>{secs > 0 ? `0:${String(secs).padStart(2, "0")}` : "resolving…"}</span>
}

// Warns when the game is near either hard end — ≤5 minutes on the 60-min clock, or ≤4
// rounds before the 40-round cap. Mounted-gated Date.now so SSR/hydration stays clean.
function EndWarning({ gameEndsAt, round, ended }: { gameEndsAt: string | null; round: number; ended: boolean }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    if (ended) { setNow(null); return }
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(t)
  }, [ended])
  if (ended || now === null) return null
  const roundsLeft = 40 - round
  const minsLeft = gameEndsAt ? Math.max(0, Math.ceil((new Date(gameEndsAt).getTime() - now) / 60000)) : null
  const msg = (minsLeft !== null && minsLeft <= 5) ? `${minsLeft} min left`
    : (roundsLeft > 0 && roundsLeft <= 4) ? `${roundsLeft} round${roundsLeft === 1 ? "" : "s"} left`
    : null
  if (!msg) return null
  return <div className="vb-warn">⏱ {msg} — game ending soon</div>
}

const DIE_FACES: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }
// Cube rotation (deg) that brings each face value to the front. Faces are laid out so
// opposite sides sum to 7 (a real die): front1/back6, right2/left5, top3/bottom4.
const FACE_ROT: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 }, 2: { x: 0, y: -90 }, 3: { x: -90, y: 0 },
  4: { x: 90, y: 0 }, 5: { x: 0, y: 90 }, 6: { x: 0, y: 180 },
}
const CUBE_FACES = [1, 6, 2, 5, 3, 4] // matches FACE_CLASS order below
const FACE_CLASS = ["f-front", "f-back", "f-right", "f-left", "f-top", "f-bottom"]

function Pips({ n }: { n: number }) {
  return (
    <>
      {Array.from({ length: 9 }, (_, i) => (
        <i key={i} className="vb-pip" style={{ opacity: DIE_FACES[n].includes(i) ? 1 : 0 }} />
      ))}
    </>
  )
}

function CubeFaces() {
  return (
    <>
      {CUBE_FACES.map((v, i) => (
        <div key={i} className={`vb-face ${FACE_CLASS[i]}`}><Pips n={v} /></div>
      ))}
    </>
  )
}

// One physical die. `n` is the authoritative server result — the cube always lands on
// FACE_ROT[n], so the final face is guaranteed correct. Only the tumble PATH is randomized
// (client-side, on mount) so repeated rolls and the two dice never look identical.
function Die3D({ n, variant, animate }: { n: number; variant: number; animate: boolean }) {
  const t = FACE_ROT[n]
  if (!animate) {
    return (
      <div className="vb-die3d">
        <div className="vb-cube" style={{ transform: `rotateX(${t.x}deg) rotateY(${t.y}deg)` }}><CubeFaces /></div>
        <span className="vb-die-shadow" />
      </div>
    )
  }
  const dir = variant === 0 ? 1 : -1
  const spinX = 360 * (2 + Math.floor(Math.random() * 2)) + (Math.random() * 40 - 20)
  const spinY = 360 * (2 + Math.floor(Math.random() * 2)) + (Math.random() * 40 - 20)
  const wobbleZ = (Math.random() * 14 + 6) * (Math.random() < 0.5 ? 1 : -1)
  const throwH = 24 + Math.random() * 12
  const ease: [number, number, number, number] = [0.16, 0.72, 0.18, 1] // fast launch → weighty settle
  return (
    <div className="vb-die3d">
      <motion.div
        className="vb-cube"
        initial={{ rotateX: t.x - spinX * dir, rotateY: t.y - spinY, rotateZ: wobbleZ, y: 0, scale: 0.86 }}
        animate={{ rotateX: t.x, rotateY: t.y, rotateZ: 0, y: [0, -throwH, 3, 0], scale: [0.86, 1.06, 0.97, 1] }}
        transition={{
          rotateX: { duration: 0.92, ease }, rotateY: { duration: 0.92, ease }, rotateZ: { duration: 0.92, ease },
          y: { duration: 0.92, times: [0, 0.42, 0.8, 1], ease: "easeOut" },
          scale: { duration: 0.92, times: [0, 0.42, 0.82, 1] },
        }}
      >
        <CubeFaces />
      </motion.div>
      <motion.span
        className="vb-die-shadow"
        initial={{ scaleX: 0.62, opacity: 0.16 }}
        animate={{ scaleX: [0.62, 0.5, 1, 0.9], opacity: [0.16, 0.1, 0.42, 0.32] }}
        transition={{ duration: 0.92, times: [0, 0.42, 0.8, 1] }}
      />
    </div>
  )
}

function Dice({ roll, seq, animate = true }: { roll: [number, number] | null; seq: string; animate?: boolean }) {
  const reduce = useReducedMotion()
  // key on the roll VALUES only → the tumble plays only when the number changes (an actual
  // roll, incl. an opponent's). Phase/turn/poll updates keep the same values, so the dice
  // sits still after a roll instead of re-bouncing on every state change.
  // ponytail: two identical consecutive rolls (doubles, or the same pair rolled next turn)
  // share a key and skip one replay — final face still correct. Add an engine rollSeq
  // counter if per-roll replay ever has to be exact.
  return (
    <div className="vb-dice" key={seq}>
      <Die3D n={roll ? roll[0] : 6} variant={0} animate={!!roll && !reduce && animate} />
      <Die3D n={roll ? roll[1] : 6} variant={1} animate={!!roll && !reduce && animate} />
    </div>
  )
}

// All player pieces on one overlay so they can ride the ring's inner edge and hop
// tile-to-tile (Ludo-style) when a position changes.
// A1 game-info cell: assigned token + first name; click to peek that player's owned cards
// as colour chips only (zone colour for cities, grey for companies) — no names, no prices.
function PlayerCell({ seat, p, token, isActive, isLeader, online, cityZones, companyCount, counter }: {
  seat: number; p: PublicView["players"][number]; token: string | null; isActive: boolean
  isLeader: boolean; online: boolean; cityZones: number[]; companyCount: number; counter: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const hasCards = cityZones.length > 0 || companyCount > 0
  return (
    <div className={`vb-pcell ${isActive ? "active" : ""} ${p.left ? "left" : ""}`} title={p.name} onClick={() => setOpen((o) => !o)}>
      {token
        ? <img src={token} alt="" className="vb-pcell-img" />
        : <span className="vb-pcell-init" style={{ background: SEAT_COL[seat % 6], color: seat % 6 === 1 ? "#0F1111" : "#fff" }}>{p.name.charAt(0).toUpperCase()}</span>}
      {isLeader && !p.left && <span className="vb-pcell-crown" dangerouslySetInnerHTML={{ __html: CROWN }} />}
      {!p.left && online && <span className="vb-pcell-dot" title="online" />}
      <span className="vb-pcell-ctr">{counter}</span>
      {open && (
        <div className="vb-pcell-pop" onClick={(e) => e.stopPropagation()}>
          {hasCards ? <>
            {cityZones.map((z, i) => <span key={`c${i}`} className="vb-chip" style={{ background: ZONE_BG[z] }} />)}
            {Array.from({ length: companyCount }, (_, i) => <span key={`co${i}`} className="vb-chip" style={{ background: "var(--grey)" }} />)}
          </> : <span className="vb-chip-none">no cards yet</span>}
        </div>
      )}
    </div>
  )
}

// One property chip in the A1 "All properties" map: zone-colour bg + initial letter.
// Bright = still up for grabs; dimmed with an owner-colour dot = taken. Click → its deed.
function PropChip({ letter, bg, dark, owner, title, onOpen }: {
  letter: string; bg: string; dark: boolean; owner: number | null; title: string; onOpen: () => void
}) {
  const free = owner === null
  return (
    <button
      type="button"
      className={`vb-pchip ${free ? "free" : "taken"}`}
      style={{ background: bg, color: dark ? "#0F1111" : "#fff" }}
      title={title}
      onClick={onOpen}
    >
      {letter.toUpperCase()}
      {!free && <span className="vb-pchip-dot" style={{ background: SEAT_COL[owner! % 6] }} />}
    </button>
  )
}

// One strategy-coach tip. Clickable when it points at a tile (opens that deed).
const TIP_ICON: Record<Tip["kind"], string> = {
  build: "🏗️", swap: "🤝", complete: "🎯", unmortgage: "🔓", company: "🏢", "trade-away": "🔁", idle: "🎲",
}
function CoachTip({ tip, onOpen }: { tip: Tip; onOpen: (pos: number) => void }) {
  const clickable = tip.pos != null
  const accent = tip.zone != null ? ZONE_BG[tip.zone] : "#8a8f98"
  return (
    <button
      type="button"
      className={`vb-coach-tip ${clickable ? "" : "static"}`}
      style={{ borderLeftColor: accent }}
      disabled={!clickable}
      onClick={clickable ? () => onOpen(tip.pos!) : undefined}
    >
      <span className="vb-coach-ic">{TIP_ICON[tip.kind]}</span>
      <span className="vb-coach-tx">{tip.text}</span>
    </button>
  )
}

// Your live balance as a rolling odometer + the last few transactions (±, coloured).
function MoneyMeter({ balance, entries }: { balance: number; entries: MoneyEntry[] }) {
  return (
    <div className="vb-money">
      <Odometer value={balance} />
      <div className="vb-money-list">
        {entries.length ? entries.map((x) => (
          <div key={x.i} className="vb-money-row">
            <span className="vb-money-lab">{x.d.label}</span>
            <span className={`vb-money-amt ${x.d.delta >= 0 ? "pos" : "neg"}`}>{x.d.delta >= 0 ? "+" : "−"}₹{Math.abs(x.d.delta).toLocaleString("en-IN")}</span>
          </div>
        )) : <div className="vb-log-empty">No transactions yet</div>}
      </div>
    </div>
  )
}

// Count-up tween toward the latest balance (odometer feel). Cubic ease-out over ~0.6s.
function Odometer({ value }: { value: number }) {
  const [display, setDisplay] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = from.current, end = value
    if (start === end) return
    let raf = 0, t0 = 0
    const tick = (t: number) => {
      if (!t0) t0 = t
      const k = Math.min(1, (t - t0) / 600)
      const eased = 1 - Math.pow(1 - k, 3)
      setDisplay(Math.round(start + (end - start) * eased))
      if (k < 1) raf = requestAnimationFrame(tick)
      else from.current = end
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <span className="vb-odo">₹{display.toLocaleString("en-IN")}</span>
}

function TokenLayer({ players, tokens, you }: { players: PublicView["players"]; tokens: (string | null)[]; you: number }) {
  return (
    <div className="vb-tok-layer">
      {players.map((p, seat) => (p.left ? null : <Token key={seat} seat={seat} pos={p.pos} url={tokens[seat] ?? null} isYou={seat === you} name={p.name.split(" ")[0]} />))}
    </div>
  )
}

function Token({ seat, pos, url, isYou, name }: { seat: number; pos: number; url: string | null; isYou: boolean; name: string }) {
  const [showName, setShowName] = useState(false)
  const controls = useAnimation()
  const reduce = useReducedMotion()
  const prev = useRef(pos)
  useEffect(() => {
    const from = prev.current
    prev.current = pos
    const a = tokenAnchor(pos)
    if (from === pos) { controls.set({ left: `${a.x}%`, top: `${a.y}%` }); return }
    const path = reduce ? [pos] : ringPath(from, pos)
    if (path.length <= 1) { void controls.start({ left: `${a.x}%`, top: `${a.y}%`, transition: { duration: 0.25 } }); return }
    const xs = path.map((i) => `${tokenAnchor(i).x}%`)
    const ys = path.map((i) => `${tokenAnchor(i).y}%`)
    void controls.start({ left: xs, top: ys, transition: { duration: Math.min(1.5, path.length * 0.14), ease: "easeInOut" } })
  }, [pos, controls, reduce])
  const a0 = tokenAnchor(pos)
  // Tooltip sits on the INNER side of the token's board edge — opposite the rail the piece
  // rides. Bottom row → above, top row → below, left col → right, right col → left.
  const [col, row] = cellPos(pos)
  const tip = row === 9 ? "up" : row === 1 ? "down" : col === 1 ? "right" : "left"
  return (
    <motion.div
      className={`vb-tok2${CORNERS.has(pos) ? " corner" : ""}`}
      initial={{ left: `${a0.x}%`, top: `${a0.y}%` }}
      animate={controls}
      style={{ zIndex: 20 + seat, marginLeft: `${(seat - 2.5) * 5}px`, marginTop: `${((seat % 3) - 1) * 4}px` }}
      onClick={() => { if (!isYou) setShowName((v) => !v) }}
    >
      {url ? <img src={url} alt="" /> : <span className="vb-tokdot" style={{ background: SEAT_COL[seat % 6] }} />}
      {isYou && <span className={`vb-toktip vb-tip-${tip}`}>You</span>}
      {!isYou && showName && <span className={`vb-toktip vb-tip-${tip}`}>{name}</span>}
    </motion.div>
  )
}

// 10 festivals (5 Hindu / 2 Muslim / 1 Christian / 1 Sikh / 1 Navodaya) — the Festival
// cell picks one deterministically by seat+round. Single tinted-sparkle effect per the
// simplification note (not 10 fully-bespoke effects yet).
const FESTIVALS = [
  { name: "Diwali", color: "#FFB300" }, { name: "Holi", color: "#E91E63" },
  { name: "Navratri", color: "#D32F2F" }, { name: "Ganesh Chaturthi", color: "#FF6D00" },
  { name: "Raksha Bandhan", color: "#8E24AA" }, { name: "Eid ul-Fitr", color: "#2E7D32" },
  { name: "Eid ul-Adha", color: "#00897B" }, { name: "Christmas", color: "#C62828" },
  { name: "Gurpurab", color: "#1565C0" }, { name: "Navodaya Day", color: "#009ae4" },
]
const CONFETTI_COLORS = ["#FE5100", "#4AB765", "#269CEF", "#FF4D93", "#FFCC1C", "#8b6fd0"]

// Bespoke landing effect over the acting player's cell. Decoration only — deterministic
// (index/seat/round-derived, no Math.random), auto-unmounts, honours reduced motion.
function EventFX({ fx, reduce }: { fx: { id: string; pos: number; seat: number; round: number }; reduce: boolean }) {
  const [col, row] = cellPos(fx.pos)
  const cw = 100 / 13, ch = 100 / 9
  const box = { left: `${(col - 1) * cw}%`, top: `${(row - 1) * ch}%`, width: `${cw}%`, height: `${ch}%` } as const
  const a = tokenAnchor(fx.pos)
  const burst = { left: `${a.x}%`, top: `${a.y}%` } as const

  if (fx.id === "tax_return") return <div className={`vb-fx fx-tax${reduce ? " still" : ""}`} style={box}><span className="fx-rupee">₹</span></div>
  if (fx.id === "ed_raid") return <div className={`vb-fx fx-raid${reduce ? " still" : ""}`} style={box} />
  if (fx.id === "jnv_revisit") return <div className={`vb-fx fx-home${reduce ? " still" : ""}`} style={box}><span className="fx-home-txt">Happy Homecoming!</span></div>
  if (fx.id === "married") {
    return (
      <div className="vb-fx fx-point" style={burst}>
        {Array.from({ length: reduce ? 6 : 16 }, (_, i) => {
          const ang = (i / 16) * Math.PI * 2, dist = 58 + (i % 4) * 16
          const dx = Math.round(Math.cos(ang) * dist), dy = Math.round(Math.sin(ang) * dist) - 18
          return <i key={i} className={`fx-conf${reduce ? " still" : ""}`} style={{ background: CONFETTI_COLORS[i % 6], ["--dx" as string]: `${dx}px`, ["--dy" as string]: `${dy}px`, animationDelay: `${(i % 5) * 40}ms` }} />
        })}
      </div>
    )
  }
  const fest = FESTIVALS[(fx.seat * 7 + fx.round * 13) % FESTIVALS.length]
  return (
    <div className="vb-fx fx-fest" style={box}>
      <span className="fx-fest-name" style={{ background: fest.color }}>{fest.name}</span>
      {!reduce && Array.from({ length: 10 }, (_, i) => {
        const ang = (i / 10) * Math.PI * 2
        const dx = Math.round(Math.cos(ang) * 42), dy = Math.round(Math.sin(ang) * 42)
        return <i key={i} className="fx-spark" style={{ background: fest.color, ["--dx" as string]: `${dx}px`, ["--dy" as string]: `${dy}px`, animationDelay: `${i * 40}ms` }} />
      })}
    </div>
  )
}

function Deed({ pos, view, you, busy, canManage, myTurn, onClose, onAction }: {
  pos: number; view: PublicView; you: number; busy: boolean; canManage: boolean; myTurn: boolean
  onClose: () => void; onAction: (i: Intent, close?: boolean) => void
}) {
  const tile = BOARD[pos]
  if (tile.kind === "company") {
    const ci = tile.companyIndex as number
    const co = COMPANIES[ci]
    const owner = view.companies[ci]
    const isPending = myTurn && view.phase === "buy" && view.pendingCompany === ci
    return (
      <div className="vb-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="vb-deed">
          <div className="vb-deed-hd" style={{ background: "linear-gradient(135deg,#4b515c,#3f4550)", color: "#fff" }}>
            <div className="vb-zone">{COMPANY_CATS[co.category]} · company</div>
            <h3>{co.name}</h3>
            <div className="vb-dprice"><div className="k">Buy</div><div className="v">{inr(co.buy)}</div></div>
          </div>
          <div className="vb-owned"><span className="chip" style={owner !== null ? { background: SEAT_COL[owner % 6] } : undefined} />{owner === null ? "Unowned — buy or auction it" : `Owned by ${view.players[owner]?.name}`}</div>
          <div className="vb-rents">
            <div className="vb-r"><span className="lab">Service fee</span><span className="amt">{inr(co.single)}</span></div>
            <div className="vb-r set"><span className="lab">Own both (pair rate)</span><span className="amt">{inr(co.pair)}</span></div>
          </div>
          <div className="vb-note">{co.sub}. No houses or hotels. Own <b>{COMPANIES[co.partner].name}</b> too and the fee jumps to the pair rate.</div>
          <div className="vb-cta">
            {isPending
              ? <><button className="buy" disabled={busy || view.players[view.you].cash < co.buy} onClick={() => onAction({ type: "buy" }, true)}>Buy · {inr(co.buy)}</button><button className="pass" disabled={busy} onClick={() => onAction({ type: "decline" }, true)}>Decline</button></>
              : <button className="pass" onClick={onClose}>Close</button>}
          </div>
        </div>
      </div>
    )
  }

  const id = tile.cityId as number
  const city = CITIES[id]
  const cs = view.cities[id]
  const dark = ZONE_DARK[city.zone]
  const rent = city.rent
  const iOwn = cs.owner === you
  const isPendingBuy = myTurn && view.phase === "buy" && view.pendingCity === id
  const houseC = shade(ZONE_BG[city.zone], 0.32), hotelC = shade(ZONE_BG[city.zone], -0.3)
  const house = houseSVGc(houseC), hotel = hotelSVGc(hotelC)
  const rows: { ic: string; lab: string; amt: number; hl?: boolean }[] = [
    { ic: "", lab: "Base rent", amt: rent[0] },
    { ic: "", lab: "With zone set", amt: rent[0] * 2, hl: true },
    { ic: house, lab: "1 house", amt: rent[1] },
    { ic: house.repeat(2), lab: "2 houses", amt: rent[2] },
    { ic: house.repeat(3), lab: "3 houses", amt: rent[3] },
    { ic: hotel, lab: "1 hotel", amt: rent[4] },
    { ic: hotel.repeat(2), lab: "2 hotels", amt: rent[5] },
    { ic: hotel.repeat(3), lab: "3 hotels", amt: rent[6] },
  ]
  return (
    <div className="vb-scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="vb-deed">
        <div className="vb-deed-hd" style={{ background: ZONE_BG[city.zone], color: dark ? "#0F1111" : "#fff" }}>
          <div className="vb-zone">{["North", "South", "East", "West", "Central"][city.zone]} zone · title deed</div>
          <h3>{city.name}</h3>
          <div className="vb-dprice"><div className="k">Buy</div><div className="v">{inr(city.price)}</div></div>
        </div>
        <div className="vb-owned"><span className="chip" style={cs.owner !== null ? { background: SEAT_COL[cs.owner % 6] } : undefined} />{cs.owner === null ? "Unowned — land here to buy or auction it" : `Owned by ${view.players[cs.owner]?.name}${cs.mortgaged ? " · mortgaged" : ""}`}</div>
        <div className="vb-rents">
          {rows.map((r, i) => (
            <div className={`vb-r ${r.hl ? "set" : ""}`} key={i}><span className="ic" dangerouslySetInnerHTML={{ __html: r.ic }} /><span className="lab">{r.lab}</span><span className="amt">{inr(r.amt)}</span></div>
          ))}
        </div>
        <div className="vb-meta">
          <div><div className="k">House cost</div><div className="v">{inr(Math.round(city.price * 0.1))}</div></div>
          <div><div className="k">Mortgage</div><div className="v">{inr(Math.floor(city.price / 2))}</div></div>
        </div>
        <div className="vb-cta">
          {isPendingBuy && <><button className="buy" disabled={busy || view.players[view.you].cash < city.price} onClick={() => onAction({ type: "buy" }, true)}>Buy · {inr(city.price)}</button><button className="pass" disabled={busy} onClick={() => onAction({ type: "decline" }, true)}>Decline</button></>}
          {!isPendingBuy && iOwn && canManage && <>
            {!cs.mortgaged && cs.level < 6 && (() => {
              const hotel = cs.level >= 3 // building to level 4+ = hotel (needs you on the tile)
              const blocked = hotel && view.players[view.you]?.pos !== CITY_POS[id]
              return <button className="buy" disabled={busy || blocked} title={blocked ? "Land on this city to build a hotel here" : undefined} onClick={() => onAction({ type: "develop", cityId: id }, true)}>{hotel ? "Build hotel" : "Build house"}</button>
            })()}
            {cs.mortgaged
              ? <button className="pass" disabled={busy} onClick={() => onAction({ type: "unmortgage", cityId: id })}>Unmortgage</button>
              : <button className="pass" disabled={busy} onClick={() => onAction({ type: "mortgage", cityId: id })}>Mortgage</button>}
            <button className="pass" disabled={busy} onClick={() => onAction({ type: "sell", cityId: id }, true)}>Sell · {inr(Math.round(((cs.mortgaged ? 0 : city.price) + cs.level * upgradeCost(id)) * 0.98))} <span className="vb-tds">−2% TDS</span></button>
            <button className="pass" onClick={onClose}>Close</button>
          </>}
          {!isPendingBuy && !(iOwn && canManage) && <button className="pass" onClick={onClose}>Close</button>}
        </div>
      </div>
    </div>
  )
}

function ZonePill({ name, zone, on, onClick }: { name: string; zone: number; on: boolean; onClick: () => void }) {
  const style = on
    ? { background: ZONE_BG[zone], borderColor: ZONE_BG[zone], color: ZONE_DARK[zone] ? "#0F1111" : "#fff" }
    : { background: "transparent", borderColor: ZONE_TX[zone], color: ZONE_TX[zone] }
  return <button type="button" className="vb-tp-pill" style={style} onClick={onClick}>{name}</button>
}

const PAYMENT_REASON: Record<string, string> = {
  "event:married": "wedding gift", "event:festival": "festival", "event:ed_raid": "ED raid",
  "event:tax_return": "tax return", "event:jnv_revisit": "JNV revisit",
  company_fee: "service fee", mandi: "Mandi bonus", rent: "rent",
}

// An auto-payment awaiting YOUR approval. Debit → "Allow or pay double"; windfall →
// "Claim or forfeit". Both show the live 10s countdown that drives the auto-penalty.
function PaymentCard({ payment, view, busy, onAction }: {
  payment: PublicView["payments"][number]; view: PublicView; busy: boolean
  onAction: (i: Intent, closeDeed?: boolean, action?: string, optimistic?: (v: PublicView) => PublicView) => void
}) {
  const who = payment.party === "bank" ? "the bank" : view.players[payment.party]?.name?.split(" ")[0] ?? "a player"
  const reason = PAYMENT_REASON[payment.reason] ?? payment.reason
  const expiry = payment.expiresAt ? new Date(payment.expiresAt).toISOString() : null
  return (
    <div className="vb-pay">
      {payment.dir === "pay" ? (
        <>
          <p className="vb-pay-body">Pay <b>₹{inr(payment.amount)}</b> to {who} · <i>{reason}</i></p>
          <p className="vb-pay-warn">Allow in <Countdown expiresAt={expiry} ended={view.ended} /> or it&apos;s auto-charged double.</p>
          <button className="vb-act primary" disabled={busy} onClick={() => onAction({ type: "confirm_payment", paymentId: payment.id }, false, "Pay", optimisticPay(payment, view.you))}>Allow · ₹{inr(payment.amount)}</button>
        </>
      ) : (
        <>
          <p className="vb-pay-body">Claim <b>₹{inr(payment.amount)}</b> · <i>{reason}</i></p>
          <p className="vb-pay-warn">Claim in <Countdown expiresAt={expiry} ended={view.ended} /> or you forfeit it.</p>
          <button className="vb-act primary" disabled={busy} onClick={() => onAction({ type: "confirm_payment", paymentId: payment.id }, false, "Claim", optimisticPay(payment, view.you))}>Claim · ₹{inr(payment.amount)}</button>
        </>
      )}
    </div>
  )
}

// Grey pill for a company in the trade builder (companies have no zone colour).
function CompanyPill({ name, on, onClick }: { name: string; on: boolean; onClick: () => void }) {
  const style = on
    ? { background: "var(--grey)", borderColor: "var(--grey)", color: "#fff" }
    : { background: "transparent", borderColor: "var(--grey)", color: "var(--grey)" }
  return <button type="button" className="vb-tp-pill" style={style} onClick={onClick}>{name}</button>
}

const CROWN = `<svg viewBox="0 0 20 16" fill="currentColor"><path d="M2.5 13.5h15l1.3-8.6-4.9 3-4-6-4 6-4.9-3z"/></svg>`
const COPY_IC = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="7" y="7" width="9" height="9" rx="1.5"/><path d="M4 13V5a1 1 0 0 1 1-1h8"/></svg>`
const CHECK_IC = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5 8 14l8-8"/></svg>`

// Shows WHAT is up for auction (name + zone/category + base price) so the bid input
// below it has context.
function AuctionInfo({ auction }: { auction: NonNullable<PublicView["auction"]> }) {
  if (auction.kind === "city") {
    const c = CITIES[auction.index]
    return (
      <div className="vb-auction-card">
        <div className="vb-auction-strip" style={{ background: ZONE_BG[c.zone], color: ZONE_DARK[c.zone] ? "#0F1111" : "#fff" }}>{c.name}</div>
        <div className="vb-auction-meta"><span>{["North", "South", "East", "West", "Central"][c.zone]} zone</span><span>Base ₹{inr(c.price)}</span></div>
      </div>
    )
  }
  const co = COMPANIES[auction.index]
  return (
    <div className="vb-auction-card">
      <div className="vb-auction-strip vb-grey">{co.name}</div>
      <div className="vb-auction-meta"><span>{COMPANY_CATS[co.category]} · company</span><span>Base ₹{inr(co.buy)}</span></div>
    </div>
  )
}

function BidControl({ busy, max, onBid }: { busy: boolean; max: number; onBid: (n: number) => void }) {
  const [amt, setAmt] = useState(0)
  return (
    <span className="vb-bid">
      <input type="number" min={0} max={max} value={amt} onChange={(e) => setAmt(Math.max(0, Math.min(max, Math.floor(Number(e.target.value)))))} />
      <button className="vb-act primary" disabled={busy} onClick={() => onBid(amt)}>Bid</button>
    </span>
  )
}

// Property-only trade builder. Cash is never part of a player trade. You can only
// propose on someone else's turn, and only one outgoing offer at a time.
function TradePropose({ view, you, myTurn, busy, onPropose }: { view: PublicView; you: number; myTurn: boolean; busy: boolean; onPropose: (i: Intent) => void }) {
  const [to, setTo] = useState<number | "">("")
  const [give, setGive] = useState<number[]>([])
  const [get, setGet] = useState<number[]>([])
  const [giveCo, setGiveCo] = useState<number[]>([])
  const [getCo, setGetCo] = useState<number[]>([])
  const hasOutgoing = (view.trades ?? []).some((t) => t.from === you)
  if (view.ended || myTurn || hasOutgoing) return null
  const mine = view.cities.map((c, id) => ({ ...c, id })).filter(tradeable(view, you))
  const theirs = to === "" ? [] : view.cities.map((c, id) => ({ ...c, id })).filter(tradeable(view, to))
  const mineCo = view.companies.map((o, ci) => ({ o, ci })).filter((x) => x.o === you).map((x) => x.ci)
  const theirsCo = to === "" ? [] : view.companies.map((o, ci) => ({ o, ci })).filter((x) => x.o === to).map((x) => x.ci)
  const toggle = (arr: number[], set: (a: number[]) => void, id: number) => set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])
  // Only send items still tradable in the current view — a pick can go stale after a poll,
  // which the server would reject as bad_give/bad_get.
  const giveValid = give.filter((id) => mine.some((c) => c.id === id))
  const getValid = get.filter((id) => theirs.some((c) => c.id === id))
  const giveCoValid = giveCo.filter((ci) => mineCo.includes(ci))
  const getCoValid = getCo.filter((ci) => theirsCo.includes(ci))
  const ready = to !== "" && (giveValid.length + giveCoValid.length) > 0 && (getValid.length + getCoValid.length) > 0
  return (
    <details className="vb-tp">
      <summary>Propose a trade</summary>
      <div className="vb-tp-body">
        <label>To:{" "}
          <select value={to} onChange={(e) => { setTo(e.target.value === "" ? "" : Number(e.target.value)); setGet([]); setGetCo([]) }}>
            <option value="">—</option>
            {view.players.map((p, seat) => seat !== you ? <option key={seat} value={seat}>{p.name}</option> : null)}
          </select>
        </label>
        <div className="vb-tp-row">
          <span className="vb-tp-lab">Give</span>
          <div className="vb-tp-pills">
            {mine.map((c) => <ZonePill key={c.id} name={CITIES[c.id].name} zone={CITIES[c.id].zone} on={give.includes(c.id)} onClick={() => toggle(give, setGive, c.id)} />)}
            {mineCo.map((ci) => <CompanyPill key={`co${ci}`} name={COMPANIES[ci].short} on={giveCo.includes(ci)} onClick={() => toggle(giveCo, setGiveCo, ci)} />)}
            {!mine.length && !mineCo.length && <span className="vb-tp-none">nothing tradable</span>}
          </div>
        </div>
        <div className="vb-tp-row">
          <span className="vb-tp-lab">Get</span>
          <div className="vb-tp-pills">
            {to === "" ? <span className="vb-tp-none">pick a player</span> : (theirs.length || theirsCo.length) ? <>
              {theirs.map((c) => <ZonePill key={c.id} name={CITIES[c.id].name} zone={CITIES[c.id].zone} on={get.includes(c.id)} onClick={() => toggle(get, setGet, c.id)} />)}
              {theirsCo.map((ci) => <CompanyPill key={`co${ci}`} name={COMPANIES[ci].short} on={getCo.includes(ci)} onClick={() => toggle(getCo, setGetCo, ci)} />)}
            </> : <span className="vb-tp-none">they have nothing tradable</span>}
          </div>
        </div>
        <button className="vb-act primary" disabled={busy || !ready} onClick={() => onPropose({ type: "propose_trade", to: to as number, give: { cash: 0, cities: giveValid, companies: giveCoValid }, get: { cash: 0, cities: getValid, companies: getCoValid } })}>Send offer</button>
      </div>
    </details>
  )
}

// One active trade in the rail. Incoming (you're the recipient) → Accept / Decline /
// Counter; outgoing (yours) → summary + Withdraw. Both show a live 60s countdown.
function TradeCard({ trade, view, you, busy, onAction }: {
  trade: PublicView["trades"][number]; view: PublicView; you: number; busy: boolean
  onAction: (i: Intent, closeDeed?: boolean, action?: string, optimistic?: (v: PublicView) => PublicView) => void
}) {
  const [countering, setCountering] = useState(false)
  const [give, setGive] = useState<number[]>([])
  const [get, setGet] = useState<number[]>([])
  const [giveCo, setGiveCo] = useState<number[]>([])
  const [getCo, setGetCo] = useState<number[]>([])
  const nm = (s: number) => view.players[s]?.name.split(" ")[0] ?? `seat ${s}`
  const sideNames = (side: TradeSide) => {
    const parts = [...side.cities.map((id) => CITIES[id].name), ...(side.companies ?? []).map((ci) => COMPANIES[ci].short)]
    return parts.length ? parts.join(", ") : "nothing"
  }
  const expiry = trade.expiresAt ? new Date(trade.expiresAt).toISOString() : null
  const incoming = trade.to === you
  // Net face value of the trade from YOUR side (cities at price, companies at buy). Shown
  // green if you come out ahead, red if you're giving up more than you get.
  const sideValue = (side: TradeSide) => side.cities.reduce((s, id) => s + CITIES[id].price, 0) + (side.companies ?? []).reduce((s, ci) => s + COMPANIES[ci].buy, 0)
  const net = incoming ? sideValue(trade.give) - sideValue(trade.get) : sideValue(trade.get) - sideValue(trade.give)
  const pnlLine = <p className={`vb-trade-pnl ${net >= 0 ? "up" : "down"}`}>You are {net >= 0 ? "+" : "−"}₹{inr(Math.abs(net))} in this trade</p>

  if (!incoming) {
    return (
      <div className="vb-trade">
        <p>Your offer to <b>{nm(trade.to)}</b> · <Countdown expiresAt={expiry} ended={view.ended} /></p>
        <p className="vb-trade-sum">You give {sideNames(trade.give)} → get {sideNames(trade.get)}</p>
        {pnlLine}
        <div className="vb-trade-btns">
          <button className="vb-act" disabled={busy} onClick={() => onAction({ type: "withdraw_trade", tradeId: trade.id }, false, "Withdraw", optimisticDropTrade(trade.id))}>Withdraw</button>
        </div>
      </div>
    )
  }

  // recipient view — Counter picker uses my level-0 cities + companies to give, proposer's to get
  const mine = view.cities.map((c, id) => ({ ...c, id })).filter(tradeable(view, you))
  const theirs = view.cities.map((c, id) => ({ ...c, id })).filter(tradeable(view, trade.from))
  const mineCo = view.companies.map((o, ci) => ({ o, ci })).filter((x) => x.o === you).map((x) => x.ci)
  const theirsCo = view.companies.map((o, ci) => ({ o, ci })).filter((x) => x.o === trade.from).map((x) => x.ci)
  const toggle = (arr: number[], set: (a: number[]) => void, id: number) => set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])
  // Prune to still-tradable items so a stale selection can't be rejected as bad_give/bad_get.
  const giveValid = give.filter((id) => mine.some((c) => c.id === id))
  const getValid = get.filter((id) => theirs.some((c) => c.id === id))
  const giveCoValid = giveCo.filter((ci) => mineCo.includes(ci))
  const getCoValid = getCo.filter((ci) => theirsCo.includes(ci))
  return (
    <div className="vb-trade">
      <p><b>{nm(trade.from)}</b> offers you a trade · <Countdown expiresAt={expiry} ended={view.ended} /></p>
      <p className="vb-trade-sum">You get {sideNames(trade.give)} → give {sideNames(trade.get)}</p>
      {pnlLine}
      {!countering ? (
        <div className="vb-trade-btns">
          <button className="vb-act primary" disabled={busy} onClick={() => onAction({ type: "respond_trade", tradeId: trade.id, accept: true }, false, "Accept", optimisticDropTrade(trade.id))}>Accept</button>
          <button className="vb-act" disabled={busy} onClick={() => onAction({ type: "respond_trade", tradeId: trade.id, accept: false }, false, "Decline", optimisticDropTrade(trade.id))}>Decline</button>
          <button className="vb-act" disabled={busy} onClick={() => setCountering(true)}>Counter</button>
        </div>
      ) : (
        <div className="vb-tp-body">
          <div className="vb-tp-row"><span className="vb-tp-lab">You give</span><div className="vb-tp-pills">
            {mine.map((c) => <ZonePill key={c.id} name={CITIES[c.id].name} zone={CITIES[c.id].zone} on={give.includes(c.id)} onClick={() => toggle(give, setGive, c.id)} />)}
            {mineCo.map((ci) => <CompanyPill key={`co${ci}`} name={COMPANIES[ci].short} on={giveCo.includes(ci)} onClick={() => toggle(giveCo, setGiveCo, ci)} />)}
            {!mine.length && !mineCo.length && <span className="vb-tp-none">nothing tradable</span>}
          </div></div>
          <div className="vb-tp-row"><span className="vb-tp-lab">You get</span><div className="vb-tp-pills">
            {theirs.map((c) => <ZonePill key={c.id} name={CITIES[c.id].name} zone={CITIES[c.id].zone} on={get.includes(c.id)} onClick={() => toggle(get, setGet, c.id)} />)}
            {theirsCo.map((ci) => <CompanyPill key={`co${ci}`} name={COMPANIES[ci].short} on={getCo.includes(ci)} onClick={() => toggle(getCo, setGetCo, ci)} />)}
          </div></div>
          <div className="vb-trade-btns">
            <button className="vb-act primary" disabled={busy || (giveValid.length + giveCoValid.length) === 0 || (getValid.length + getCoValid.length) === 0} onClick={() => onAction({ type: "counter_trade", tradeId: trade.id, give: { cash: 0, cities: giveValid, companies: giveCoValid }, get: { cash: 0, cities: getValid, companies: getCoValid } })}>Send counter</button>
            <button className="vb-act" disabled={busy} onClick={() => setCountering(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// company category icons, indexed by COMPANY_CATS: 0 Travel, 1 Communication, 2 Food
const CAT_ICON = [
  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M10 2.5c.9 0 1.3 1 1.3 2.7v2.6l5.2 3v1.8l-5.2-1.4v3.4l1.8 1.4v1.3L10 17.3 6.9 18.3v-1.3l1.8-1.4v-3.4l-5.2 1.4V11.8l5.2-3V5.2c0-1.7.4-2.7 1.3-2.7Z"/></svg>`,
  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="14.5" r="1.1" fill="currentColor" stroke="none"/><path d="M6.6 11.2a5 5 0 0 1 6.8 0M4 8.4a9 9 0 0 1 12 0"/></svg>`,
  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M5 7.5h10l-1.1 9.5H6.1Z"/><path d="M7.2 7.5V5.5a2.8 2.8 0 0 1 5.6 0v2"/></svg>`,
]
const SPECIAL_ICON: Record<string, string> = {
  start: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v14"/><path d="M5 4h9l-2 3 2 3H5"/></svg>`,
  monsoon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 10a3 3 0 0 1 .3-6 4 4 0 0 1 7.5 1.2A2.7 2.7 0 0 1 14 10Z"/><path d="M7 13l-1 3M11 13l-1 3M14 13l-1 2"/></svg>`,
  mandi: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><ellipse cx="10" cy="5.5" rx="6" ry="2.5"/><path d="M4 5.5v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4M4 9.5v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4"/></svg>`,
  taxraid: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3 2 16h16Z"/><path d="M10 8v4"/><circle cx="10" cy="14.2" r=".4" fill="currentColor"/></svg>`,
}
// Icons for the five Indian-business event tiles, keyed by EventId.
const EVENT_ICON: Record<string, string> = {
  tax_return: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="12" height="14" rx="1"/><path d="M7 8h4M7 11h6"/><path d="M13.5 6.5 15.5 8l-2 1.5"/></svg>`,
  married: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="12" r="3.6"/><circle cx="12" cy="12" r="3.6"/><path d="M6.5 6.2 8 8.4M13.5 6.2 12 8.4" stroke-linecap="round"/></svg>`,
  festival: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v3M10 15v3M2 10h3M15 10h3M4.6 4.6l2 2M13.4 13.4l2 2M15.4 4.6l-2 2M6.6 13.4l-2 2"/><circle cx="10" cy="10" r="2.2"/></svg>`,
  ed_raid: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M10 2.5 4 5v5c0 3.5 2.6 6 6 7.5 3.4-1.5 6-4 6-7.5V5Z"/><path d="M8 10l1.5 1.5L13 8" stroke-linecap="round"/></svg>`,
  jnv_revisit: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3 3 6.5 10 10l7-3.5Z"/><path d="M6 8.5V13c0 1 2 2 4 2s4-1 4-2V8.5"/></svg>`,
}

const VB_CSS = `
.vb { --bg:#f3f2ef; --panel:#ffffff; --panel-2:#faf9f7; --line:#e2e0da; --milk:#F5F2EA; --cream:#0F1111; --dim:#6b7280; --ink:#0F1111; --ink-2:#565b66; --accent:#FE5100; --yellow:#FFCC1C; --gold:#B8860B; --grey:#4b515c; --grey-2:#3f4550; font-family:"Poppins",system-ui,sans-serif; color:var(--cream); position:fixed; inset:0; z-index:60; overflow-y:auto; background:var(--bg); padding:8px 12px; }
.vb-exit{font-family:"Poppins";font-weight:600;font-size:.82rem;color:var(--dim);text-decoration:none;border:1px solid var(--line);border-radius:2px;padding:.35rem .7rem;background:transparent;cursor:pointer;}
.vb-exit:disabled{opacity:.5;cursor:default;}
.vb-pl.left{opacity:.45;}
.vb-exit:hover{color:var(--cream);border-color:var(--accent);}
.vb *{box-sizing:border-box;}
.vb svg{display:block;width:100%;height:100%;}
.vb-top{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:8px;}
.vb-you{display:flex;align-items:center;gap:8px;}
.vb-you-img{width:30px;height:30px;border-radius:2px;object-fit:cover;}
.vb-you-init{width:30px;height:30px;border-radius:2px;display:grid;place-items:center;font-weight:700;font-size:.85rem;}
.vb-you-name{font-weight:600;font-size:.9rem;color:var(--cream);}
.vb-you-cash{font-weight:700;font-size:.9rem;color:var(--gold);font-variant-numeric:tabular-nums;padding-left:4px;}
.vb-halt{margin-left:auto;font-size:.58rem;font-weight:700;color:#FF8f7f;text-transform:uppercase;letter-spacing:.04em;}
.vb-stage{display:grid;grid-template-columns:1fr clamp(400px,36vw,560px);gap:16px;align-items:stretch;}
@media(max-width:940px){.vb-stage{grid-template-columns:1fr;}}
.vb-board{aspect-ratio:13/9;width:min(100%,calc((100dvh - 72px) * 1.444));background:var(--panel-2);border-radius:2px;padding:6px;margin:0 auto 0 0;}
.vb-grid{position:relative;width:100%;height:100%;display:grid;grid-template-columns:repeat(13,1fr);grid-template-rows:repeat(9,1fr);gap:2px;background:var(--line);border:2px solid var(--line);border-radius:2px;overflow:hidden;}
.vb-tile{position:relative;background:var(--milk);min-width:0;display:flex;flex-direction:column;overflow:hidden;}
.vb-city,.vb-company{cursor:pointer;}
.vb-city:hover,.vb-company:hover{outline:2px solid var(--accent);outline-offset:-2px;z-index:3;}
.vb-strip{height:34%;min-height:12px;display:flex;align-items:center;justify-content:center;padding:0 2px;}
.vb-strip.vb-grey{background:var(--grey);color:#fff;}
.vb-nm{font-weight:700;font-size:clamp(5px,.7vw,9px);line-height:1;letter-spacing:-.01em;text-align:center;}
.vb-mid{flex:1;display:flex;align-items:center;justify-content:center;gap:1px;padding:1px;}
.vb-mid svg{width:clamp(7px,.95vw,11px);height:clamp(7px,.95vw,11px);}
.vb-cat{color:var(--grey);width:clamp(10px,1.3vw,15px);height:clamp(10px,1.3vw,15px);}
.vb-price{text-align:center;font-size:clamp(4px,.62vw,8px);font-weight:700;padding:0 2px 2px;line-height:1.1;}
.vb-price.vb-co{color:var(--grey-2);}
.vb-own{position:absolute;top:2px;right:2px;width:6px;height:6px;border-radius:2px;border:1px solid #fff;}
.vb-special{background:#F2F2F2;align-items:center;justify-content:center;gap:2px;padding:2px;}
.vb-special .vb-sic{color:var(--ink);width:clamp(11px,1.5vw,20px);height:clamp(11px,1.5vw,20px);}
.vb-slb{font-size:clamp(4px,.6vw,7px);font-weight:600;text-transform:uppercase;letter-spacing:.03em;color:var(--ink-2);text-align:center;line-height:1;}
.vb-corner{background:#1a1d24;align-items:center;justify-content:center;gap:3px;padding:4px;}
.vb-corner .vb-sic{width:clamp(14px,2vw,26px);height:clamp(14px,2vw,26px);}
.vb-corner .vb-slb{color:#F2F2F2;font-size:clamp(5px,.7vw,9px);font-weight:700;}
.vb-start .vb-sic,.vb-start .vb-slb{color:var(--accent);}
.vb-mandi .vb-sic,.vb-mandi .vb-slb{color:var(--yellow);}
.vb-monsoon .vb-sic{color:#269CEF;}
.vb-taxraid .vb-sic,.vb-taxraid .vb-slb{color:#FF4D93;}
.vb-tok{position:absolute;width:22%;max-width:12px;aspect-ratio:1;border-radius:2px;border:1.5px solid #fff;bottom:2px;left:2px;}
.vb-tok:nth-of-type(2){left:28%;}.vb-tok:nth-of-type(3){left:54%;}.vb-tok:nth-of-type(4){left:auto;right:2px;}
.vb-hub{grid-column:2/13;grid-row:2/9;background:var(--panel);display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:clamp(8px,2vw,24px);padding:clamp(8px,1.6vw,18px);}
.vb-hub-mid{display:flex;flex-direction:column;align-items:center;gap:clamp(10px,2.4vw,24px);min-width:0;}
.vb-hub-side{align-self:stretch;display:flex;flex-direction:column;min-height:0;overflow:hidden;}
.vb-hub-h{font-size:.58rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--dim);margin-bottom:6px;}
/* mid-left boxed how-to tutorial */
.vb-howto{background:var(--panel-2);border:1px solid var(--line);border-radius:6px;padding:clamp(8px,1.2vw,14px);gap:0;}
.vb-howto-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:clamp(6px,1.1vw,11px);flex:1;min-height:0;overflow-y:auto;}
.vb-howto-step{display:grid;grid-template-columns:auto auto 1fr;align-items:start;gap:7px;font-size:clamp(.58rem,.95vw,.8rem);color:var(--dim);line-height:1.3;}
.vb-howto-num{grid-row:1;width:16px;height:16px;border-radius:50%;display:grid;place-items:center;font-size:.62rem;font-weight:800;color:#fff;flex:none;margin-top:1px;}
.vb-howto-ic{font-size:.95rem;line-height:1;}
.vb-howto-tx b{color:var(--cream);font-weight:700;}
.vb-howto-foot{margin-top:9px;padding-top:8px;border-top:1px dashed var(--line);font-size:clamp(.58rem,.95vw,.8rem);font-weight:700;color:var(--gold);}
/* mid-right split: game log (top) + coach (bottom) */
.vb-hubright{align-items:stretch;gap:10px;}
.vb-hubright-log{flex:0 0 auto;display:flex;flex-direction:column;min-height:0;max-height:38%;}
.vb-hubright-log .vb-log-list{flex:1;min-height:0;max-height:none;overflow-y:auto;}
.vb-hubright-coach{flex:1;display:flex;flex-direction:column;min-height:0;border-top:1px solid var(--line);padding-top:8px;}
.vb-coach-list{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:5px;}
.vb-coach-tip{display:flex;align-items:flex-start;gap:7px;text-align:left;width:100%;background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--line);border-radius:4px;padding:6px 8px;cursor:pointer;font-family:"Poppins";color:var(--dim);transition:border-color .12s,background .12s;}
.vb-coach-tip:hover:not(.static){border-color:var(--accent);background:var(--panel-2);}
.vb-coach-tip.static{cursor:default;}
.vb-coach-ic{font-size:.9rem;line-height:1.2;flex:none;}
.vb-coach-tx{font-size:.72rem;line-height:1.3;color:var(--cream);}
@media(max-width:720px){.vb-hub{grid-template-columns:1fr;}.vb-hub-side{display:none;}}
.vb-hub-name{font-weight:800;font-size:clamp(1.1rem,3.2vw,2.2rem);letter-spacing:-.02em;color:var(--cream);line-height:1;}
.vb-dice{display:flex;gap:16px;perspective:560px;perspective-origin:50% 42%;}
.vb-die3d{--ds:clamp(30px,4.6vw,48px);position:relative;width:var(--ds);height:var(--ds);transform-style:preserve-3d;}
.vb-cube{position:absolute;inset:0;transform-style:preserve-3d;will-change:transform;}
.vb-face{position:absolute;inset:0;background:linear-gradient(150deg,#fff,#f0f0f0 60%,#e2e2e2);border-radius:calc(var(--ds)*.15);display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);padding:15%;gap:6%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06),inset 0 -2px 3px rgba(0,0,0,.12);backface-visibility:hidden;}
.vb-face.f-front{transform:translateZ(calc(var(--ds)/2));}
.vb-face.f-back{transform:rotateY(180deg) translateZ(calc(var(--ds)/2));}
.vb-face.f-right{transform:rotateY(90deg) translateZ(calc(var(--ds)/2));}
.vb-face.f-left{transform:rotateY(-90deg) translateZ(calc(var(--ds)/2));}
.vb-face.f-top{transform:rotateX(90deg) translateZ(calc(var(--ds)/2));}
.vb-face.f-bottom{transform:rotateX(-90deg) translateZ(calc(var(--ds)/2));}
.vb-pip{align-self:center;justify-self:center;width:80%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 34% 30%,#454545,#0F1111 72%);box-shadow:inset 0 -1px 1px rgba(255,255,255,.14);}
.vb-die-shadow{position:absolute;left:50%;bottom:calc(var(--ds)*-.2);width:82%;height:calc(var(--ds)*.22);translate:-50% 0;background:radial-gradient(ellipse at center,rgba(0,0,0,.42),transparent 70%);border-radius:50%;filter:blur(1px);pointer-events:none;}
.vb-roll{font-family:"Poppins";font-weight:700;font-size:clamp(.72rem,1.3vw,.9rem);border:none;cursor:pointer;color:#fff;background:var(--accent);padding:.5rem 1.6rem;border-radius:2px;}
.vb-roll:disabled{opacity:.4;cursor:not-allowed;}
.vb-rail{display:flex;flex-direction:column;gap:12px;min-width:0;}
.vb-turn{background:var(--panel-2);border:1px solid var(--line);border-radius:2px;padding:12px 14px;}
.vb-turn-row{display:flex;align-items:center;justify-content:space-between;gap:8px;}.vb-turn-row b{font-size:1rem;}
.vb-count{font-weight:700;font-size:1.15rem;color:var(--accent);font-variant-numeric:tabular-nums;}.vb-count.low{color:#FF4D93;}
.vb-players{display:flex;flex-direction:column;gap:8px;}
.vb-pl{display:flex;align-items:center;gap:10px;background:var(--panel-2);border:1px solid var(--line);border-radius:2px;padding:8px 11px;}
.vb-pl.active{border-color:var(--accent);}
.vb-av{width:28px;height:28px;border-radius:2px;display:grid;place-items:center;font-weight:700;font-size:.8rem;flex:none;}
.vb-av-img{object-fit:cover;}
.vb-plnm{font-weight:600;font-size:.84rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.vb-plst{margin-left:auto;text-align:right;}.vb-cash{font-weight:700;font-size:.82rem;color:var(--gold);display:block;}.vb-sub{font-size:.62rem;color:var(--dim);}
.vb-ginfo{display:flex;gap:12px;flex-wrap:wrap;font-size:.72rem;color:var(--dim);font-weight:500;padding:0 2px 2px;}
.vb-ginfo b{color:var(--cream);}
.vb-panel-head{font-size:.58rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--dim);margin-bottom:6px;}
.vb-yinfo{background:var(--panel-2);border:1px solid var(--line);border-radius:2px;padding:10px 12px;}
.vb-yi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;}
.vb-yi-grid div{display:flex;flex-direction:column;align-items:center;gap:1px;font-size:.54rem;color:var(--dim);font-weight:600;text-transform:uppercase;letter-spacing:.02em;text-align:center;}
.vb-yi-grid div b{font-size:1.15rem;color:var(--cream);font-weight:700;}
.vb-log{background:var(--panel-2);border:1px solid var(--line);border-radius:2px;padding:10px 12px;}
.vb-log-list{display:flex;flex-direction:column;gap:4px;max-height:150px;overflow-y:auto;}
.vb-log-line{font-size:.74rem;color:var(--dim);line-height:1.3;}
.vb-log-empty{font-size:.74rem;color:var(--ink-2);}
.vb-err{background:#fdecea;color:#c0392b;border:1px solid #f5c6c2;border-radius:2px;padding:8px 11px;font-size:.8rem;margin:0;}
.vb-actions{display:flex;flex-wrap:wrap;gap:8px;}
.vb-act{font-family:"Poppins";font-weight:600;font-size:.84rem;padding:.55rem .9rem;border-radius:2px;border:1px solid var(--line);background:var(--panel-2);color:var(--cream);cursor:pointer;}
.vb-act.primary{border:none;color:#fff;background:var(--accent);}
.vb-act:disabled{opacity:.5;cursor:not-allowed;}
.vb-bid{display:flex;gap:6px;}.vb-bid input{width:90px;background:var(--panel-2);border:1px solid var(--line);border-radius:2px;color:var(--cream);padding:.5rem;font-family:"Poppins";}
.vb-trade{background:var(--panel-2);border:1px solid var(--gold);border-radius:2px;padding:10px 12px;font-size:.84rem;}
.vb-trade p{margin:0 0 8px;}.vb-trade-btns{display:flex;gap:8px;flex-wrap:wrap;}
.vb-trade-sum{font-size:.8rem;color:var(--ink-2,#6b7280);}
.vb-rent{background:var(--panel-2);border:1px solid var(--green);border-radius:2px;padding:10px 12px;margin-bottom:8px;font-size:.84rem;}
.vb-pay{background:var(--panel-2);border:1px solid var(--accent);border-radius:2px;padding:10px 12px;font-size:.84rem;display:flex;flex-direction:column;gap:6px;}
.vb-pay-body{margin:0;}
.vb-pay-warn{margin:0;font-size:.72rem;color:var(--accent);font-weight:600;}
.vb-pay .vb-act{width:100%;}
.vb-rescue{background:var(--panel-2);border:1px dashed var(--gold);border-radius:2px;padding:10px 12px;margin-bottom:8px;font-size:.84rem;}
.vb-rescue-head{margin:0 0 4px;font-weight:700;}
.vb-rescue-body{margin:0 0 8px;color:var(--dim);}
.vb-rescue .vb-act{width:100%;}
.vb-rent-head{margin:0 0 4px;font-weight:700;color:var(--green);}
.vb-rent-body{margin:0 0 8px;}
.vb-rent .vb-act{width:100%;}
.vb-pl-count{margin-left:auto;}
.vb-pl-count .vb-count{font-size:.95rem;}
.vb-tp-row{display:flex;flex-direction:column;gap:5px;}
.vb-tp-lab{font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--dim);}
.vb-tp-pills{display:flex;flex-wrap:wrap;gap:5px;align-items:center;}
.vb-tp-pill{border:1px solid var(--line);background:transparent;color:var(--cream);border-radius:2px;padding:.25rem .55rem;font-family:"Poppins";font-size:.72rem;font-weight:500;cursor:pointer;}
.vb-tp-pill.on{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600;}
.vb-tp-cash{width:70px;background:var(--panel);border:1px solid var(--line);border-radius:2px;color:var(--cream);padding:.25rem .4rem;font-family:"Poppins";font-size:.72rem;}
.vb-tp-none{font-size:.72rem;color:var(--ink-2);}
.vb-tp{background:var(--panel-2);border:1px solid var(--line);border-radius:2px;padding:10px 12px;font-size:.82rem;}
.vb-tp summary{cursor:pointer;font-weight:600;}
.vb-tp-body{display:flex;flex-direction:column;gap:8px;margin-top:8px;}
.vb-tp select,.vb-tp input[type=number]{background:var(--panel);border:1px solid var(--line);border-radius:2px;color:var(--cream);padding:.3rem;font-family:"Poppins";}
.vb-tp input[type=number]{width:80px;}.vb-tp label{margin-right:8px;}
.vb-crown{width:15px;height:12px;color:var(--gold);display:inline-flex;flex:none;}
.vb-crown svg{width:100%;height:100%;}
.vb-dot{width:7px;height:7px;border-radius:50%;background:#3ec46d;flex:none;}
.vb-props{width:min(360px,100%);background:var(--panel);color:var(--cream);border:1px solid var(--line);border-radius:2px;overflow:hidden;max-height:80vh;display:flex;flex-direction:column;}
.vb-props-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;font-weight:700;border-bottom:1px solid var(--line);}
.vb-props-x{background:transparent;border:none;color:var(--dim);font-size:1rem;cursor:pointer;}
.vb-props-list{padding:10px 12px;display:flex;flex-direction:column;gap:6px;overflow-y:auto;}
.vb-prop-card{display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--panel-2);border:1px solid var(--line);border-left:4px solid var(--line);border-radius:2px;padding:9px 12px;cursor:pointer;text-align:left;font-family:"Poppins";}
.vb-prop-nm{font-weight:600;font-size:.86rem;color:var(--cream);}
.vb-prop-sub{font-size:.66rem;color:var(--dim);}
.vb-scrim{position:fixed;inset:0;background:rgba(15,17,17,.8);display:flex;align-items:center;justify-content:center;padding:20px;z-index:50;}
.vb-over{width:min(340px,100%);background:var(--panel);border:1px solid var(--line);border-radius:2px;padding:26px 22px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px;}
.vb-over-crown{width:44px;height:36px;color:var(--yellow);}
.vb-over h3{font-size:1.5rem;font-weight:800;margin:0;color:var(--cream);}
.vb-over p{margin:0;font-size:.86rem;color:var(--dim);}
.vb-over .vb-act{margin-top:8px;width:100%;}
.vb-scrim-results{overflow-y:auto;padding:24px 16px;align-items:flex-start;justify-content:center;}
.vb-results-wrap{display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;max-width:920px;margin:auto;}
.vb-results-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;}
.vb-deed{width:min(370px,100%);background:#fff;color:var(--ink);border-radius:2px;overflow:hidden;max-height:90vh;overflow-y:auto;}
.vb-deed-hd{padding:16px 18px 15px;position:relative;}
.vb-zone{font-size:.64rem;font-weight:600;text-transform:uppercase;letter-spacing:.16em;opacity:.95;}
.vb-deed-hd h3{font-size:1.6rem;font-weight:800;margin:2px 0 0;line-height:1.05;padding-right:66px;}
.vb-dprice{position:absolute;top:14px;right:16px;text-align:right;}.vb-dprice .k{font-size:.58rem;text-transform:uppercase;letter-spacing:.08em;font-weight:600;opacity:.9;}.vb-dprice .v{font-weight:700;font-size:1.1rem;}
.vb-owned{display:flex;align-items:center;gap:8px;padding:8px 18px;background:#eaeaea;font-size:.74rem;color:var(--ink-2);font-weight:500;}
.vb-owned .chip{width:14px;height:14px;border-radius:2px;background:#c9c9c9;}
.vb-rents{padding:10px 18px;}
.vb-r{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #eee;font-size:.84rem;}.vb-r:last-child{border:none;}
.vb-r .ic{width:72px;display:flex;gap:2px;}.vb-r .ic svg{width:14px;height:14px;}
.vb-r .lab{color:var(--ink-2);}.vb-r .amt{margin-left:auto;font-weight:700;}
.vb-r.set{background:#fff5e6;margin:0 -18px;padding:6px 18px;}
.vb-note{font-size:.72rem;color:var(--ink-2);padding:0 18px 10px;line-height:1.4;}
.vb-meta{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#e6e6e6;border-top:1px solid #e6e6e6;}
.vb-meta div{background:#fff;padding:9px 18px;}.vb-meta .k{font-size:.6rem;text-transform:uppercase;letter-spacing:.07em;color:var(--ink-2);font-weight:600;}.vb-meta .v{font-weight:700;}
.vb-cta{display:flex;gap:8px;padding:13px 18px 16px;}
.vb-cta button{flex:1;font-family:"Poppins";font-weight:700;font-size:.88rem;padding:.68rem;border-radius:2px;border:none;cursor:pointer;}
.vb-cta .buy{color:#fff;background:var(--accent);}.vb-cta .pass{background:#fff;border:1px solid #d9d9d9;color:var(--ink-2);}
.vb-cta button:disabled{opacity:.5;cursor:not-allowed;}
.vb-top-right{display:flex;align-items:center;gap:10px;}
.vb-code{display:inline-flex;align-items:center;gap:6px;font-family:"Poppins";font-size:.8rem;color:var(--cream);border:1px solid var(--line);background:var(--panel);border-radius:2px;padding:.35rem .6rem;cursor:pointer;}
.vb-code b{font-variant-numeric:tabular-nums;letter-spacing:.06em;}
.vb-code-lab{color:var(--dim);font-weight:600;font-size:.68rem;text-transform:uppercase;letter-spacing:.06em;}
.vb-code-ic{width:14px;height:14px;color:var(--dim);}
.vb-code:hover{border-color:var(--accent);}
.vb-report-btn{font-family:"Poppins";font-weight:600;font-size:.78rem;color:var(--dim);border:1px solid var(--line);background:transparent;border-radius:2px;padding:.35rem .6rem;cursor:pointer;}
.vb-report-btn:hover{color:#c0392b;border-color:#c0392b;}
.vb-roll-status{font-size:.8rem;font-weight:600;color:var(--dim);text-align:center;margin-top:2px;}
.vb-jail-acts{display:flex;flex-direction:column;gap:6px;align-items:center;}
.vb-jail-sit{font-family:"Poppins";font-weight:600;font-size:.78rem;padding:.4rem .9rem;border-radius:2px;border:1px solid var(--line);background:transparent;color:var(--dim);cursor:pointer;}
.vb-jail-sit:disabled{opacity:.5;cursor:not-allowed;}
.vb-warn{margin-top:6px;font-size:.72rem;font-weight:700;color:#c0392b;background:#fdecea;border:1px solid #f5c6c2;border-radius:999px;padding:2px 10px;}
.vb-trade-pnl{margin:2px 0 8px;font-size:.78rem;font-weight:700;}
.vb-trade-pnl.up{color:#2E9455;}
.vb-trade-pnl.down{color:#c0392b;}
.vb-tok-img{position:absolute;width:34%;max-width:18px;aspect-ratio:1;bottom:2px;border-radius:50%;object-fit:cover;border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.35);}
.vb-tok-img.vb-tok-corner{width:22%;max-width:12px;}
.vb-report{width:min(420px,100%);background:var(--panel);color:var(--cream);border:1px solid var(--line);border-radius:2px;overflow:hidden;}
.vb-report-hd{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;font-weight:700;border-bottom:1px solid var(--line);}
.vb-report-body{padding:14px 16px;display:flex;flex-direction:column;gap:10px;}
.vb-report-sub{margin:0;font-size:.8rem;color:var(--dim);}
.vb-report-ta{width:100%;min-height:110px;resize:vertical;background:var(--panel-2);border:1px solid var(--line);border-radius:2px;color:var(--cream);padding:.6rem;font-family:"Poppins";font-size:.85rem;}
.vb-report-ok{margin:0;font-size:.9rem;color:#2E9455;font-weight:600;}
.vb-quad{display:grid;grid-template-columns:1fr 1fr;gap:10px;min-height:0;min-width:0;}
@media(min-width:941px){.vb-quad{grid-template-rows:1fr 1.3fr;height:calc(100dvh - 78px);}}
@media(max-width:940px){.vb-quad{grid-auto-rows:minmax(170px,42vh);}}
.vb-cell{display:flex;flex-direction:column;min-height:0;min-width:0;background:var(--panel-2);border:1px solid var(--line);border-radius:2px;padding:9px 10px;overflow:hidden;}
.vb-cell .vb-panel-head{margin-bottom:8px;}
.vb-pgrid{display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:min-content;align-content:start;gap:6px;flex:1;min-height:0;overflow:auto;}
.vb-pcell{position:relative;aspect-ratio:4/5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;background:var(--panel);border:1px solid var(--line);border-radius:3px;padding:5px 3px;min-height:0;}
.vb-pcell.active{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent);}
.vb-pcell.left{opacity:.45;}
.vb-pcell-img,.vb-pcell-init{width:clamp(26px,3.4vw,42px);height:clamp(26px,3.4vw,42px);border-radius:50%;object-fit:cover;display:grid;place-items:center;font-weight:700;font-size:.9rem;}
.vb-pcell-ctr{font-size:.62rem;font-weight:700;color:var(--dim);font-variant-numeric:tabular-nums;line-height:1;min-height:.8em;}
.vb-pcell.active .vb-pcell-ctr .vb-count{font-size:.72rem;}
.vb-pcell-crown{position:absolute;top:3px;left:3px;width:13px;height:11px;color:var(--gold);}
.vb-pcell-crown svg{width:100%;height:100%;}
.vb-pcell-dot{position:absolute;top:4px;right:4px;width:7px;height:7px;border-radius:50%;background:#3ec46d;}
.vb-pcell{cursor:pointer;}
.vb-pcell-name{font-size:.6rem;font-weight:700;color:var(--cream);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1;}
.vb-pcell-pop{position:absolute;top:calc(100% + 4px);left:0;z-index:20;background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:6px;display:flex;flex-wrap:wrap;gap:3px;width:100%;box-shadow:0 4px 14px rgba(0,0,0,.25);}
.vb-chip{width:12px;height:12px;border-radius:2px;border:1px solid rgba(0,0,0,.15);}
.vb-chip-none{font-size:.6rem;color:var(--dim);}
/* A1 "all properties" map — bright = free, dim + owner dot = taken */
.vb-allprops-h{margin-top:10px;}
.vb-allprops{display:grid;grid-template-columns:repeat(auto-fill,minmax(22px,1fr));gap:4px;overflow-y:auto;min-height:0;}
.vb-pchip{position:relative;aspect-ratio:1;min-width:0;border:none;border-radius:3px;font-family:"Poppins";font-weight:800;font-size:.62rem;line-height:1;display:grid;place-items:center;cursor:pointer;padding:0;}
.vb-pchip.taken{opacity:.34;filter:saturate(.7);}
.vb-pchip.free{box-shadow:0 0 0 1.5px rgba(255,255,255,.5);}
.vb-pchip.free:hover,.vb-pchip.taken:hover{opacity:1;filter:none;outline:1.5px solid var(--accent);}
.vb-pchip-dot{position:absolute;right:1px;bottom:1px;width:6px;height:6px;border-radius:50%;border:1px solid rgba(255,255,255,.85);}
/* Token tooltip — a small screenshot-style card, placed on the token's INNER side (opposite
   the board edge it rides) so it never spills off the board. One variant per side. */
.vb-toktip{position:absolute;font-size:.58rem;font-weight:700;color:#fff;background:rgba(15,17,17,.92);border:1px solid rgba(255,255,255,.18);border-radius:5px;padding:2px 6px;white-space:nowrap;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.35);z-index:40;}
.vb-tip-up{bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:4px;}
.vb-tip-down{top:100%;left:50%;transform:translateX(-50%);margin-top:4px;}
.vb-tip-right{left:100%;top:50%;transform:translateY(-50%);margin-left:4px;}
.vb-tip-left{right:100%;top:50%;transform:translateY(-50%);margin-right:4px;}
.vb-jailbars{position:absolute;pointer-events:none;z-index:30;background:repeating-linear-gradient(90deg,rgba(20,22,26,.9) 0 2px,transparent 2px 8px);border-radius:2px;}
.vb-props-inline{display:flex;flex-direction:column;gap:6px;flex:1;min-height:0;overflow-y:auto;}
.vb-props-inline .vb-prop-card{border-left-width:6px;}
.vb-cell .vb-log-list{flex:1;min-height:0;max-height:none;}
.vb-notif{display:flex;flex-direction:column;gap:8px;flex:1;min-height:0;overflow-y:auto;}
.vb-notif-line{font-size:.72rem;color:var(--dim);line-height:1.3;border-bottom:1px solid var(--line);padding-bottom:4px;}
.vb-notif-line:last-child{border-bottom:none;}
.vb-rent{border-color:var(--line);}
.vb-collect{align-self:flex-start;font-family:"Poppins";font-weight:600;font-size:.7rem;padding:.25rem .5rem;border-radius:2px;border:1px solid var(--line);background:transparent;color:var(--dim);cursor:pointer;}
.vb-collect:hover{color:var(--cream);border-color:var(--dim);}
.vb-collect:disabled{opacity:.5;cursor:not-allowed;}
/* Action (formerly Notifications) buttons: white fill, orange text/border. */
.vb-notif .vb-act.primary,.vb-notif .vb-collect{background:#fff;color:var(--accent);border:1px solid var(--accent);}
.vb-notif .vb-collect:hover{color:var(--accent);border-color:var(--accent);background:#fff5ef;}
.vb-money{display:flex;flex-direction:column;gap:8px;flex:1;min-height:0;}
.vb-odo{font-size:clamp(1.1rem,2.4vw,1.7rem);font-weight:800;color:var(--cream);font-variant-numeric:tabular-nums;letter-spacing:-.01em;}
.vb-money-list{display:flex;flex-direction:column;gap:4px;flex:1;min-height:0;overflow-y:auto;}
.vb-money-row{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:.72rem;}
.vb-money-lab{color:var(--dim);}
.vb-money-amt{font-weight:700;font-variant-numeric:tabular-nums;}
.vb-money-amt.pos{color:#1f9d55;}
.vb-money-amt.neg{color:#e5484d;}
.vb-tok-layer{position:absolute;inset:0;pointer-events:none;z-index:4;}
.vb-tok2{position:absolute;transform:translate(-50%,-50%);width:6.24%;max-width:31px;aspect-ratio:1;pointer-events:auto;cursor:pointer;}
.vb-tok2.corner{width:4.32%;max-width:19px;}
/* Tokens use the raw uploaded image as-is — no frame, no crop, no rounded mask. */
.vb-tok2 img{width:100%;height:100%;object-fit:contain;display:block;}
.vb-tok2 .vb-tokdot{display:block;width:72%;height:72%;margin:14%;border-radius:22%;border:1.6px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.35);}
.vb-auction{display:flex;flex-direction:column;gap:8px;border:1px solid var(--accent);border-radius:2px;padding:10px;}
.vb-auction-head{margin:0;font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--accent);}
.vb-auction-card{border:1px solid var(--line);border-radius:2px;overflow:hidden;background:var(--panel);}
.vb-auction-strip{padding:6px 10px;font-weight:700;font-size:.9rem;}
.vb-auction-strip.vb-grey{background:var(--grey);color:#fff;}
.vb-auction-meta{display:flex;justify-content:space-between;gap:8px;padding:6px 10px;font-size:.72rem;color:var(--dim);}
.vb-auction-wait{margin:0;font-size:.76rem;color:var(--dim);}
.vb-fx{position:absolute;pointer-events:none;z-index:12;display:flex;align-items:center;justify-content:center;overflow:visible;}
.fx-tax{background:radial-gradient(circle,#FFE082,#FFC107);border-radius:2px;color:#5a3d00;animation:fx-hold 3s ease forwards;box-shadow:0 0 10px 2px rgba(255,193,7,.7);}
.fx-rupee{font-weight:800;font-size:1.1em;}
.fx-raid{border-radius:2px;animation:fx-hold 4s ease forwards,fx-raidsweep .8s linear infinite;}
.fx-home{background:#0b0b0b;border-radius:2px;animation:fx-hold 5s ease forwards;}
.fx-home-txt{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);white-space:nowrap;font-weight:800;font-size:9px;animation:fx-rgby 1.1s linear infinite;}
.fx-fest{border-radius:2px;}
.fx-fest-name{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);white-space:nowrap;color:#fff;font-weight:800;font-size:8px;padding:2px 6px;border-radius:2px;animation:fx-hold 3s ease forwards;box-shadow:0 1px 4px rgba(0,0,0,.4);}
.fx-point{width:0;height:0;}
.fx-conf{position:absolute;left:0;top:0;width:6px;height:9px;border-radius:1px;transform:translate(0,0);animation:fx-confetti 1.6s ease-out forwards;}
.fx-spark{position:absolute;left:50%;top:50%;width:5px;height:5px;border-radius:50%;animation:fx-spark 1.1s ease-out forwards;}
.fx-tax.still,.fx-raid.still,.fx-home.still,.fx-conf.still{animation:none;opacity:1;}
@keyframes fx-hold{0%{opacity:0;}12%{opacity:1;}82%{opacity:1;}100%{opacity:0;}}
@keyframes fx-raidsweep{0%,100%{box-shadow:inset 0 0 0 2px #E53935,0 0 8px 1px rgba(229,57,53,.8);}50%{box-shadow:inset 0 0 0 2px #1E88E5,0 0 8px 1px rgba(30,136,229,.8);}}
@keyframes fx-rgby{0%{color:#E53935;}25%{color:#43A047;}50%{color:#1E88E5;}75%{color:#FDD835;}100%{color:#E53935;}}
@keyframes fx-confetti{0%{transform:translate(0,0) scale(.2) rotate(0);opacity:0;}15%{opacity:1;transform:translate(calc(var(--dx)*.45),calc(var(--dy)*.45)) scale(1) rotate(80deg);}100%{transform:translate(var(--dx),calc(var(--dy) + 90px)) scale(1) rotate(300deg);opacity:0;}}
@keyframes fx-spark{0%{transform:translate(-50%,-50%) scale(0);opacity:1;}70%{opacity:1;}100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1);opacity:0;}}
`
