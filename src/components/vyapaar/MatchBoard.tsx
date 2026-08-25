"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { realtimeTokenAction } from "@/modules/vyapaar/match-actions"
import { CITIES, COMPANIES, COMPANY_CATS, COMPANY_POS, upgradeCost, UPGRADE_SELL_RATIO } from "@/modules/vyapaar/engine/data"
import { BOARD, CITY_POS } from "@/modules/vyapaar/engine/board"
import type { PublicView } from "@/modules/vyapaar/engine/view"
import type { Intent } from "@/modules/vyapaar/engine/state"

const MATCH_TOPIC = (id: string) => `vyapaar-match:${id}`

// bright zone palette (strip bg) + darkened text-on-milk variant
const ZONE_BG = ["#FE5100", "#4AB765", "#FF4D93", "#269CEF", "#FFCC1C"]
const ZONE_TX = ["#E04800", "#2E9455", "#E43D80", "#1E86D0", "#C08A00"]
const ZONE_DARK = [false, false, false, false, true] // yellow → dark text on strip
const SEAT_COL = ["#269CEF", "#FFCC1C", "#4AB765", "#FF4D93", "#FE5100", "#8b6fd0"]

const inr = (n: number) => n.toLocaleString("en-IN")

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

const SPECIAL_LABEL: Record<string, string> = {
  start: "START", monsoon: "MONSOON", mandi: "MANDI", taxraid: "TAX RAID",
  gst: "GST", income: "INCOME", upi: "UPI", headline: "NEWS",
}

// minimal inline icons
const houseSVG = `<svg viewBox="0 0 16 16" style="color:#4AB765"><path d="M8 2 14.5 7.5V14.5H1.5V7.5Z" fill="currentColor"/></svg>`
const hotelSVG = `<svg viewBox="0 0 16 16" style="color:#FE5100"><path d="M2 15V5h6v10Zm7 0V8h5v7Z" fill="currentColor"/></svg>`
const buildIcons = (level: number) => {
  const hotels = Math.max(0, level - 3)
  const houses = level <= 3 ? level : 0
  return hotelSVG.repeat(hotels) + houseSVG.repeat(houses)
}

// Turn an engine event into a human game-log line (₹, first names). Unknown events → null.
function logLine(e: Record<string, unknown>, players: PublicView["players"]): string | null {
  const nm = (s: unknown) => (typeof s === "number" ? (players[s]?.name.split(" ")[0] ?? `seat ${s}`) : "?")
  const rup = (n: unknown) => `₹${Number(n).toLocaleString("en-IN")}`
  const city = (i: unknown) => CITIES[i as number]?.name ?? "?"
  switch (e.type) {
    case "roll": return `${nm(e.seat)} rolled ${Number(e.a) + Number(e.b)}`
    case "buy": return `${nm(e.seat)} bought ${city(e.cityId)} for ${rup(e.amount)}`
    case "buy_company": return `${nm(e.seat)} bought ${COMPANIES[e.companyIndex as number]?.short ?? "?"} for ${rup(e.amount)}`
    case "rent_pending": return `${nm(e.seat)} owes ${rup(e.amount)} rent to ${nm(e.to)} — ${nm(e.to)} can collect`
    case "rent": return Number(e.amount) > 0 ? `${nm(e.to)} collected ${rup(e.amount)} rent from ${nm(e.seat)}` : `${nm(e.to)} collected rent from ${nm(e.seat)}`
    case "rent_void": return `rent to ${nm(e.to)} was voided`
    case "company_fee": return `${nm(e.seat)} paid ${rup(e.amount)} service`
    case "salary": return `${nm(e.seat)} got ${rup(e.amount)} salary`
    case "mandi": return `${nm(e.seat)} scooped the ${rup(e.amount)} pot`
    case "gst": return `${nm(e.seat)} paid ${rup(e.amount)} GST`
    case "income": return `${nm(e.seat)} paid ${rup(e.amount)} income tax`
    case "auction_won": return `${nm(e.seat)} won an auction for ${rup(e.amount)}`
    case "develop": return `${nm(e.seat)} built on ${city(e.cityId)}`
    case "mortgage": return `${nm(e.seat)} mortgaged ${city(e.cityId)}`
    case "unmortgage": return `${nm(e.seat)} cleared ${city(e.cityId)}`
    case "taxraid": case "jail_doubles": return `${nm(e.seat)} → jail`
    case "trade_proposed": return `${nm(e.seat)} proposed a trade to ${nm(e.to)}`
    case "trade_accepted": return `${nm(e.from)} & ${nm(e.to)} traded`
    case "trade_declined": return `a trade was declined`
    case "trade_countered": return `${nm(e.seat)} countered with a new offer`
    case "trade_withdrawn": return `${nm(e.seat)} withdrew a trade`
    case "trade_expired": return `a trade offer expired`
    case "trade_cancelled": return `a trade was cancelled`
    case "left": return `${nm(e.seat)} left the game`
    case "restructure": return `${nm(e.seat)} restructured (+${rup(e.amount)})`
    case "game_over": return `${nm(e.seat)} won the game`
    default: return null
  }
}

export function MatchBoard({ matchId, initialView, initialTurnExpiresAt, playerImages = [] }: { matchId: string; initialView: PublicView; initialTurnExpiresAt: string | null; playerImages?: (string | null)[] }) {
  const [view, setView] = useState<PublicView>(initialView)
  const [turnExpiresAt, setTurnExpiresAt] = useState<string | null>(initialTurnExpiresAt)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [openTile, setOpenTile] = useState<number | null>(null) // board position of the open deed
  const [onlineSeats, setOnlineSeats] = useState<Set<number>>(new Set())
  const [showProps, setShowProps] = useState(false)
  const you = view.you
  // Timestamp of our last successful own action. The server broadcasts a "state"
  // nudge to everyone including us, but our POST already returned the fresh view —
  // so we skip the redundant self-refetch for a short window after acting.
  const lastActRef = useRef(0)

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/vyapaar/${matchId}/view`, { cache: "no-store" })
    if (res.ok) { const d = await res.json(); setView(d.view); setTurnExpiresAt(d.turnExpiresAt ?? null); setErr(null) }
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

  // Auto-open the deed the moment you must decide to buy — one fewer click than
  // clicking a rail button just to open the modal. Opens once per pending target,
  // so manually closing it to peek at the board doesn't fight you by reopening.
  const buyTarget = view.active === you && !view.ended && view.phase === "buy"
    ? (view.pendingCity !== null ? CITY_POS[view.pendingCity]
      : view.pendingCompany !== null ? COMPANY_POS[view.pendingCompany] : null)
    : null
  const autoOpenedRef = useRef<number | null>(null)
  useEffect(() => {
    if (buyTarget !== null && autoOpenedRef.current !== buyTarget) {
      setOpenTile(buyTarget); autoOpenedRef.current = buyTarget
    } else if (buyTarget === null) {
      autoOpenedRef.current = null
    }
  }, [buyTarget])

  const send = useCallback(async (intent: Intent, closeDeed = false) => {
    setErr(null); setBusy(true)
    try {
      const res = await fetch(`/api/vyapaar/${matchId}/intent`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent }),
      })
      const data = await res.json()
      if (!res.ok) setErr(data.error ?? "error")
      else { lastActRef.current = Date.now(); setView(data.view); setTurnExpiresAt(data.turnExpiresAt ?? null); if (closeDeed) setOpenTile(null) }
    } finally { setBusy(false) }
  }, [matchId])

  const myTurn = view.active === you && !view.ended
  const canManage = myTurn && (view.phase === "roll" || view.phase === "manage")
  const seatName = (seat: number | null) => (seat === null ? null : view.players[seat]?.name)
  const myCities = view.cities.map((c, id) => ({ ...c, id })).filter((c) => c.owner === you)
  const myHouses = myCities.reduce((n, c) => n + Math.min(c.level, 3), 0)
  const myHotels = myCities.reduce((n, c) => n + Math.max(0, c.level - 3), 0)
  const myCompanies = view.companies.filter((c) => c === you).length
  const myRents = (view.pendingRents ?? []).filter((r) => r.owner === you)
  const leaderSeat = view.players.reduce((b, p, i) => (!p.left && p.score > view.players[b].score ? i : b), 0)
  const logLines = view.log.map((e, i) => ({ line: logLine(e as Record<string, unknown>, view.players), i })).filter((x) => x.line).slice(-8).reverse()
  const iLeft = view.players[you]?.left ?? false

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
        <div className="vb-you">
          {playerImages[you]
            ? <img src={playerImages[you]!} alt="" className="vb-you-img" />
            : <span className="vb-you-init" style={{ background: SEAT_COL[you % 6], color: you % 6 === 1 ? "#0F1111" : "#fff" }}>{(view.players[you]?.name ?? "?").charAt(0).toUpperCase()}</span>}
          <span className="vb-you-name">{(view.players[you]?.name ?? "").split(" ")[0]}</span>
          <span className="vb-you-cash">{inr(view.players[you]?.cash ?? 0)}</span>
        </div>
      </header>

      <div className="vb-stage">
        <div className="vb-board-outer">
          <div className="vb-board">
            <div className="vb-grid">
              {BOARD.map((t) => {
                const [c, r] = cellPos(t.pos)
                // only the current player's own token is shown on the board
                const tokens = view.players[you]?.pos === t.pos
                  ? <span className="vb-tok" style={{ background: SEAT_COL[you % 6] }} />
                  : null
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
                      <div className="vb-mid" dangerouslySetInnerHTML={{ __html: cs.mortgaged ? "" : buildIcons(cs.level) }} />
                      <div className="vb-price" style={{ color: ZONE_TX[city.zone] }}>{cs.mortgaged ? "mortgaged" : inr(city.price)}</div>
                      {cs.owner !== null && <span className="vb-own" style={{ background: SEAT_COL[cs.owner % 6] }} />}
                      {tokens}
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
                      {tokens}
                    </div>
                  )
                }
                const corner = ["start", "monsoon", "mandi", "taxraid"].includes(t.kind)
                return (
                  <div key={t.pos} className={`vb-tile ${corner ? "vb-corner vb-" + t.kind : "vb-special"}`} style={style}>
                    <span className="vb-sic" dangerouslySetInnerHTML={{ __html: SPECIAL_ICON[t.kind] ?? "" }} />
                    <span className="vb-slb">{SPECIAL_LABEL[t.kind]}</span>
                    {tokens}
                  </div>
                )
              })}

              <div className="vb-hub">
                <div className="vb-hub-name">व्यापार</div>
                <Dice roll={view.lastRoll} seq={view.lastRoll ? `${view.lastRoll[0]}-${view.lastRoll[1]}` : "none"} />
                <button
                  className="vb-roll"
                  disabled={busy || !myTurn || view.phase !== "roll"}
                  onClick={() => send({ type: "roll" })}
                >Roll</button>
              </div>
            </div>
          </div>
        </div>

        <div className="vb-rail">
          <div className="vb-ginfo">
            <span>Round <b>{view.round}</b></span>
            <span>{view.players.length} players</span>
            <span>pot <b>₹{inr(view.pot)}</b></span>
          </div>
          <div className="vb-players">
            {view.players.map((p, seat) => (
              <div key={seat} className={`vb-pl ${seat === view.active ? "active" : ""} ${p.left ? "left" : ""}`}>
                {playerImages[seat]
                  ? <img src={playerImages[seat]!} alt="" className="vb-av vb-av-img" />
                  : <span className="vb-av" style={{ background: SEAT_COL[seat % 6], color: seat % 6 === 1 ? "#0F1111" : "#fff" }}>{p.name.charAt(0).toUpperCase()}</span>}
                <span className="vb-plnm">{p.name}{seat === you ? " (you)" : ""}</span>
                {seat === leaderSeat && !p.left && <span className="vb-crown" dangerouslySetInnerHTML={{ __html: CROWN }} />}
                {!p.left && onlineSeats.has(seat) && <span className="vb-dot" title="online" />}
                {p.left
                  ? <span className="vb-halt">left</span>
                  : seat === view.active && !view.ended
                    ? <span className="vb-pl-count"><Countdown expiresAt={turnExpiresAt} ended={view.ended} /></span>
                    : p.halted ? <span className="vb-halt">halted</span> : null}
              </div>
            ))}
          </div>

          <div className="vb-yinfo">
            <div className="vb-panel-head">Your info</div>
            <div className="vb-yi-grid">
              <div><b>{myCities.length}</b>Properties</div>
              <div><b>{myHouses}</b>Houses</div>
              <div><b>{myHotels}</b>Hotels</div>
              <div><b>{myCompanies}</b>Companies</div>
            </div>
          </div>

          <div className="vb-log">
            <div className="vb-panel-head">Game log</div>
            <div className="vb-log-list">
              {logLines.length ? logLines.map((x) => <div key={x.i} className="vb-log-line">{x.line}</div>) : <div className="vb-log-empty">No moves yet</div>}
            </div>
          </div>

          {err && <p className="vb-err">{err}</p>}

          {myRents.map((r) => (
            <div key={r.id} className="vb-rent">
              <p className="vb-rent-head">Someone just visited your city</p>
              <p className="vb-rent-body">
                <b>{seatName(r.payer)}</b> landed on <b>{CITIES[r.cityId].name}</b>
              </p>
              <button className="vb-act primary" disabled={busy} onClick={() => send({ type: "collect_rent", rentId: r.id })}>
                Collect ₹{inr(r.amount)} rent
              </button>
            </div>
          ))}

          {myTurn && view.youCanRestructure && (
            <div className="vb-rescue">
              <p className="vb-rescue-head">Falling behind?</p>
              <p className="vb-rescue-body">Take ₹{inr(view.restructure.advance)} now — a reduced salary over your next {view.restructure.laps} laps repays it. One-time.</p>
              <button className="vb-act primary" disabled={busy} onClick={() => send({ type: "restructure" })}>Restructure · +₹{inr(view.restructure.advance)}</button>
            </div>
          )}

          <div className="vb-actions">
            {myTurn && view.phase === "roll" && <button className="vb-act primary" disabled={busy} onClick={() => send({ type: "roll" })}>Roll</button>}
            {myTurn && view.phase === "buy" && (
              <button className="vb-act primary" disabled={busy} onClick={() => setOpenTile(buyTarget)}>Review purchase</button>
            )}
            {view.phase === "auction" && view.auction && !view.auction.bidded[you] && (
              <BidControl busy={busy} max={view.players[you].cash} onBid={(amount) => send({ type: "bid", amount })} />
            )}
            <button className="vb-act" onClick={() => setShowProps(true)}>My Properties</button>
          </div>

          {(view.trades ?? []).map((t) => (
            <TradeCard key={t.id} trade={t} view={view} you={you} busy={busy} onAction={send} />
          ))}

          <TradePropose view={view} you={you} myTurn={myTurn} busy={busy} onPropose={(i) => send(i)} />
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

      {showProps && (
        <div className="vb-scrim" onClick={(e) => { if (e.target === e.currentTarget) setShowProps(false) }}>
          <div className="vb-props">
            <div className="vb-props-head"><span>Your properties</span><button className="vb-props-x" onClick={() => setShowProps(false)}>✕</button></div>
            <div className="vb-props-list">
              {myCities.length ? myCities.map((c) => (
                <button key={c.id} className="vb-prop-card" style={{ borderLeftColor: ZONE_BG[CITIES[c.id].zone] }} onClick={() => { setShowProps(false); setOpenTile(CITY_POS[c.id]) }}>
                  <span className="vb-prop-nm">{CITIES[c.id].name}</span>
                  <span className="vb-prop-sub">{c.mortgaged ? "mortgaged" : c.level === 0 ? "unbuilt" : `level ${c.level}`}</span>
                </button>
              )) : <div className="vb-tp-none">You don&apos;t own any property yet</div>}
            </div>
          </div>
        </div>
      )}
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

function Dice({ roll, seq }: { roll: [number, number] | null; seq: string }) {
  const reduce = useReducedMotion()
  // key on the roll VALUES only → the tumble plays only when the number changes (an actual
  // roll, incl. an opponent's). Phase/turn/poll updates keep the same values, so the dice
  // sits still after a roll instead of re-bouncing on every state change.
  // ponytail: two identical consecutive rolls (doubles, or the same pair rolled next turn)
  // share a key and skip one replay — final face still correct. Add an engine rollSeq
  // counter if per-roll replay ever has to be exact.
  return (
    <div className="vb-dice" key={seq}>
      <Die3D n={roll ? roll[0] : 6} variant={0} animate={!!roll && !reduce} />
      <Die3D n={roll ? roll[1] : 6} variant={1} animate={!!roll && !reduce} />
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
  const rows: { ic: string; lab: string; amt: number; hl?: boolean }[] = [
    { ic: "", lab: "Base rent", amt: rent[0] },
    { ic: "", lab: "With zone set", amt: rent[0] * 2, hl: true },
    { ic: houseSVG, lab: "1 house", amt: rent[1] },
    { ic: houseSVG.repeat(2), lab: "2 houses", amt: rent[2] },
    { ic: houseSVG.repeat(3), lab: "3 houses", amt: rent[3] },
    { ic: hotelSVG, lab: "1 hotel", amt: rent[4] },
    { ic: hotelSVG.repeat(2), lab: "2 hotels", amt: rent[5] },
    { ic: hotelSVG.repeat(3), lab: "3 hotels", amt: rent[6] },
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
            {!cs.mortgaged && cs.level === 0 && <button className="buy" disabled={busy} onClick={() => onAction({ type: "develop", cityId: id })}>Develop</button>}
            {!cs.mortgaged && cs.level > 0 && <button className="buy" disabled={busy} onClick={() => onAction({ type: "develop", cityId: id })}>Develop</button>}
            {cs.mortgaged
              ? <button className="pass" disabled={busy} onClick={() => onAction({ type: "unmortgage", cityId: id })}>Unmortgage</button>
              : <button className="pass" disabled={busy} onClick={() => onAction({ type: "mortgage", cityId: id })}>Mortgage</button>}
            <button className="pass" disabled={busy} onClick={() => onAction({ type: "sell", cityId: id }, true)}>Sell · {inr((cs.mortgaged ? 0 : Math.floor(city.price / 2)) + Math.floor(cs.level * upgradeCost(id) * UPGRADE_SELL_RATIO))}</button>
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

const CROWN = `<svg viewBox="0 0 20 16" fill="currentColor"><path d="M2.5 13.5h15l1.3-8.6-4.9 3-4-6-4 6-4.9-3z"/></svg>`

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
  const hasOutgoing = (view.trades ?? []).some((t) => t.from === you)
  if (view.ended || myTurn || hasOutgoing) return null
  const mine = view.cities.map((c, id) => ({ ...c, id })).filter((c) => c.owner === you && c.level === 0 && !c.mortgaged)
  const theirs = to === "" ? [] : view.cities.map((c, id) => ({ ...c, id })).filter((c) => c.owner === to && c.level === 0 && !c.mortgaged)
  const toggle = (arr: number[], set: (a: number[]) => void, id: number) => set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])
  const ready = to !== "" && give.length > 0 && get.length > 0
  return (
    <details className="vb-tp">
      <summary>Propose a trade</summary>
      <div className="vb-tp-body">
        <label>To:{" "}
          <select value={to} onChange={(e) => { setTo(e.target.value === "" ? "" : Number(e.target.value)); setGet([]) }}>
            <option value="">—</option>
            {view.players.map((p, seat) => seat !== you ? <option key={seat} value={seat}>{p.name}</option> : null)}
          </select>
        </label>
        <div className="vb-tp-row">
          <span className="vb-tp-lab">Give</span>
          <div className="vb-tp-pills">
            {mine.length ? mine.map((c) => <ZonePill key={c.id} name={CITIES[c.id].name} zone={CITIES[c.id].zone} on={give.includes(c.id)} onClick={() => toggle(give, setGive, c.id)} />) : <span className="vb-tp-none">no tradable property</span>}
          </div>
        </div>
        <div className="vb-tp-row">
          <span className="vb-tp-lab">Get</span>
          <div className="vb-tp-pills">
            {to === "" ? <span className="vb-tp-none">pick a player</span> : theirs.length ? theirs.map((c) => <ZonePill key={c.id} name={CITIES[c.id].name} zone={CITIES[c.id].zone} on={get.includes(c.id)} onClick={() => toggle(get, setGet, c.id)} />) : <span className="vb-tp-none">they have no tradable property</span>}
          </div>
        </div>
        <button className="vb-act primary" disabled={busy || !ready} onClick={() => onPropose({ type: "propose_trade", to: to as number, give: { cash: 0, cities: give }, get: { cash: 0, cities: get } })}>Send offer</button>
      </div>
    </details>
  )
}

// One active trade in the rail. Incoming (you're the recipient) → Accept / Decline /
// Counter; outgoing (yours) → summary + Withdraw. Both show a live 60s countdown.
function TradeCard({ trade, view, you, busy, onAction }: {
  trade: PublicView["trades"][number]; view: PublicView; you: number; busy: boolean; onAction: (i: Intent) => void
}) {
  const [countering, setCountering] = useState(false)
  const [give, setGive] = useState<number[]>([])
  const [get, setGet] = useState<number[]>([])
  const nm = (s: number) => view.players[s]?.name.split(" ")[0] ?? `seat ${s}`
  const names = (ids: number[]) => ids.length ? ids.map((id) => CITIES[id].name).join(", ") : "nothing"
  const expiry = trade.expiresAt ? new Date(trade.expiresAt).toISOString() : null
  const incoming = trade.to === you

  if (!incoming) {
    return (
      <div className="vb-trade">
        <p>Your offer to <b>{nm(trade.to)}</b> · <Countdown expiresAt={expiry} ended={view.ended} /></p>
        <p className="vb-trade-sum">You give {names(trade.give.cities)} → get {names(trade.get.cities)}</p>
        <div className="vb-trade-btns">
          <button className="vb-act" disabled={busy} onClick={() => onAction({ type: "withdraw_trade", tradeId: trade.id })}>Withdraw</button>
        </div>
      </div>
    )
  }

  // recipient view — Counter picker uses my level-0 cities to give and the proposer's to get
  const mine = view.cities.map((c, id) => ({ ...c, id })).filter((c) => c.owner === you && c.level === 0 && !c.mortgaged)
  const theirs = view.cities.map((c, id) => ({ ...c, id })).filter((c) => c.owner === trade.from && c.level === 0 && !c.mortgaged)
  const toggle = (arr: number[], set: (a: number[]) => void, id: number) => set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])
  return (
    <div className="vb-trade">
      <p><b>{nm(trade.from)}</b> offers you a trade · <Countdown expiresAt={expiry} ended={view.ended} /></p>
      <p className="vb-trade-sum">You get {names(trade.give.cities)} → give {names(trade.get.cities)}</p>
      {!countering ? (
        <div className="vb-trade-btns">
          <button className="vb-act primary" disabled={busy} onClick={() => onAction({ type: "respond_trade", tradeId: trade.id, accept: true })}>Accept</button>
          <button className="vb-act" disabled={busy} onClick={() => onAction({ type: "respond_trade", tradeId: trade.id, accept: false })}>Decline</button>
          <button className="vb-act" disabled={busy} onClick={() => setCountering(true)}>Counter</button>
        </div>
      ) : (
        <div className="vb-tp-body">
          <div className="vb-tp-row"><span className="vb-tp-lab">You give</span><div className="vb-tp-pills">
            {mine.length ? mine.map((c) => <ZonePill key={c.id} name={CITIES[c.id].name} zone={CITIES[c.id].zone} on={give.includes(c.id)} onClick={() => toggle(give, setGive, c.id)} />) : <span className="vb-tp-none">no tradable property</span>}
          </div></div>
          <div className="vb-tp-row"><span className="vb-tp-lab">You get</span><div className="vb-tp-pills">
            {theirs.map((c) => <ZonePill key={c.id} name={CITIES[c.id].name} zone={CITIES[c.id].zone} on={get.includes(c.id)} onClick={() => toggle(get, setGet, c.id)} />)}
          </div></div>
          <div className="vb-trade-btns">
            <button className="vb-act primary" disabled={busy || give.length === 0 || get.length === 0} onClick={() => onAction({ type: "counter_trade", tradeId: trade.id, give: { cash: 0, cities: give }, get: { cash: 0, cities: get } })}>Send counter</button>
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
  gst: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="4" y="3" width="12" height="14" rx="1"/><path d="M7 7h6M7 10h6M7 13h4"/></svg>`,
  income: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h10v14l-2.5-1.5L10 17l-2.5-1.5L5 17Z"/><path d="M8 7h4M8 10h4"/></svg>`,
  upi: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="6" y="3" width="8" height="14" rx="1.5"/><path d="M9 14.5h2"/></svg>`,
  headline: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="3" y="4" width="14" height="12" rx="1"/><path d="M6 7h5M6 10h5M6 13h3M13 7v6"/></svg>`,
}

const VB_CSS = `
.vb { --bg:#0F1111; --panel:#1A1D24; --panel-2:#232732; --line:#2c313c; --milk:#F5F2EA; --cream:#F2F2F2; --dim:#9aa0ac; --ink:#0F1111; --ink-2:#565b66; --accent:#FE5100; --yellow:#FFCC1C; --grey:#4b515c; --grey-2:#3f4550; font-family:"Poppins",system-ui,sans-serif; color:var(--cream); position:fixed; inset:0; z-index:60; overflow-y:auto; background:var(--bg); padding:8px 12px; }
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
.vb-you-cash{font-weight:700;font-size:.9rem;color:var(--yellow);font-variant-numeric:tabular-nums;padding-left:4px;}
.vb-halt{margin-left:auto;font-size:.58rem;font-weight:700;color:#FF8f7f;text-transform:uppercase;letter-spacing:.04em;}
.vb-stage{display:grid;grid-template-columns:1fr 300px;gap:16px;}
@media(max-width:940px){.vb-stage{grid-template-columns:1fr;}}
.vb-board{aspect-ratio:13/9;width:min(100%,calc((100dvh - 72px) * 1.444));background:var(--panel-2);border-radius:2px;padding:6px;margin:0 auto 0 0;}
.vb-grid{width:100%;height:100%;display:grid;grid-template-columns:repeat(13,1fr);grid-template-rows:repeat(9,1fr);gap:2px;background:var(--line);border:2px solid var(--line);border-radius:2px;overflow:hidden;}
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
.vb-corner{background:var(--ink);align-items:center;justify-content:center;gap:3px;padding:4px;}
.vb-corner .vb-sic{width:clamp(14px,2vw,26px);height:clamp(14px,2vw,26px);}
.vb-corner .vb-slb{color:var(--cream);font-size:clamp(5px,.7vw,9px);font-weight:700;}
.vb-start .vb-sic,.vb-start .vb-slb{color:var(--accent);}
.vb-mandi .vb-sic,.vb-mandi .vb-slb{color:var(--yellow);}
.vb-monsoon .vb-sic{color:#269CEF;}
.vb-taxraid .vb-sic,.vb-taxraid .vb-slb{color:#FF4D93;}
.vb-tok{position:absolute;width:22%;max-width:12px;aspect-ratio:1;border-radius:2px;border:1.5px solid #fff;bottom:2px;left:2px;}
.vb-tok:nth-of-type(2){left:28%;}.vb-tok:nth-of-type(3){left:54%;}.vb-tok:nth-of-type(4){left:auto;right:2px;}
.vb-hub{grid-column:2/13;grid-row:2/9;background:var(--panel);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(10px,2.6vw,26px);padding:clamp(8px,1.6vw,18px);}
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
.vb-plst{margin-left:auto;text-align:right;}.vb-cash{font-weight:700;font-size:.82rem;color:var(--yellow);display:block;}.vb-sub{font-size:.62rem;color:var(--dim);}
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
.vb-err{background:#3a1f1a;color:#FF8f7f;border:1px solid #5a2f28;border-radius:2px;padding:8px 11px;font-size:.8rem;margin:0;}
.vb-actions{display:flex;flex-wrap:wrap;gap:8px;}
.vb-act{font-family:"Poppins";font-weight:600;font-size:.84rem;padding:.55rem .9rem;border-radius:2px;border:1px solid var(--line);background:var(--panel-2);color:var(--cream);cursor:pointer;}
.vb-act.primary{border:none;color:#fff;background:var(--accent);}
.vb-act:disabled{opacity:.5;cursor:not-allowed;}
.vb-bid{display:flex;gap:6px;}.vb-bid input{width:90px;background:var(--panel-2);border:1px solid var(--line);border-radius:2px;color:var(--cream);padding:.5rem;font-family:"Poppins";}
.vb-trade{background:var(--panel-2);border:1px solid var(--yellow);border-radius:2px;padding:10px 12px;font-size:.84rem;}
.vb-trade p{margin:0 0 8px;}.vb-trade-btns{display:flex;gap:8px;flex-wrap:wrap;}
.vb-trade-sum{font-size:.8rem;color:var(--ink-2,#6b7280);}
.vb-rent{background:var(--panel-2);border:1px solid var(--green);border-radius:2px;padding:10px 12px;margin-bottom:8px;font-size:.84rem;}
.vb-rescue{background:var(--panel-2);border:1px dashed var(--yellow);border-radius:2px;padding:10px 12px;margin-bottom:8px;font-size:.84rem;}
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
.vb-crown{width:15px;height:12px;color:var(--yellow);display:inline-flex;flex:none;}
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
`
